package com.neuroforge.user.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.neuroforge.user.github.repository.GitHubConnectionRepository;
import com.neuroforge.user.github.repository.GitHubWebhookEventRepository;
import com.neuroforge.user.model.Project;
import com.neuroforge.user.service.ProjectService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import static org.springframework.http.HttpStatus.*;

@Service
public class GitHubIntegrationService {
    private static final String GITHUB_API = "https://api.github.com";
    private static final SecureRandom RANDOM = new SecureRandom();
    private final GitHubConnectionRepository connectionRepository;
    private final GitHubWebhookEventRepository eventRepository;
    private final ProjectService projectService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();
    private final Map<String, OAuthState> oauthStates = new ConcurrentHashMap<>();

    @Value("${github.oauth.client-id:}") private String clientId;
    @Value("${github.oauth.client-secret:}") private String clientSecret;
    @Value("${github.oauth.callback-url:http://localhost:8081/github/oauth/callback}") private String callbackUrl;
    @Value("${github.oauth.frontend-url:http://localhost:5173}") private String frontendUrl;
    @Value("${github.webhook.public-url:}") private String webhookPublicUrl;
    @Value("${github.token-encryption-key:}") private String encryptionKey;

    public GitHubIntegrationService(
            GitHubConnectionRepository connectionRepository,
            GitHubWebhookEventRepository eventRepository,
            ProjectService projectService,
            ObjectMapper objectMapper) {
        this.connectionRepository = connectionRepository;
        this.eventRepository = eventRepository;
        this.projectService = projectService;
        this.objectMapper = objectMapper;
    }

    public Map<String, String> beginOAuth(String projectId, String repositoryUrl, String userId) {
        ensureConfigured();
        RepositoryCoordinates repo = parseRepository(repositoryUrl);
        projectService.getProject(projectId);
        oauthStates.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(Instant.now()));
        byte[] randomState = new byte[32];
        RANDOM.nextBytes(randomState);
        String state = Base64.getUrlEncoder().withoutPadding().encodeToString(randomState);
        oauthStates.put(state, new OAuthState(projectId, repositoryUrl.trim(), userId, Instant.now().plusSeconds(600)));
        String authorizationUrl = UriComponentsBuilder.fromUriString("https://github.com/login/oauth/authorize")
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", callbackUrl)
                .queryParam("scope", "repo admin:repo_hook")
                .queryParam("state", state)
                .build().encode().toUriString();
        return Map.of("authorizationUrl", authorizationUrl);
    }

    public String completeOAuth(String code, String state) {
        OAuthState oauthState = oauthStates.remove(state);
        if (oauthState == null || oauthState.expiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(BAD_REQUEST, "GitHub authorization state is invalid or expired");
        }
        if (code == null || code.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "GitHub did not return an authorization code");
        }
        String accessToken = exchangeCode(code);
        RepositoryCoordinates repo = parseRepository(oauthState.repositoryUrl());
        verifyRepositoryAccess(repo, accessToken);

        GitHubConnection connection = connectionRepository.findByProjectId(oauthState.projectId())
                .orElseGet(GitHubConnection::new);
        boolean sameRepository = repo.owner().equalsIgnoreCase(connection.getOwner())
                && repo.repository().equalsIgnoreCase(connection.getRepository());
        if (connection.getId() != null && connection.getWebhookId() != null && !sameRepository) {
            try {
                removeRemoteWebhook(connection, decrypt(connection.getEncryptedAccessToken()));
            } catch (RuntimeException ignored) {
                // Keep OAuth reconnection available if the old hook was already removed.
            }
            connection.setWebhookId(null);
        }
        connection.setProjectId(oauthState.projectId());
        connection.setRepositoryUrl(oauthState.repositoryUrl());
        connection.setOwner(repo.owner());
        connection.setRepository(repo.repository());
        connection.setEncryptedAccessToken(encrypt(accessToken));
        connection.setWebhookError(null);
        connection.setConnectedAt(Instant.now());
        connectionRepository.save(connection);
        projectService.updateRepositoryUrl(oauthState.projectId(), oauthState.repositoryUrl());
        configureWebhook(connection, accessToken);
        return frontendRedirect(connection.getWebhookError() == null ? "connected" : "webhook_error");
    }

    public Map<String, Object> fetchActivity(String projectId) {
        GitHubConnection connection = connectionRepository.findByProjectId(projectId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "GitHub is not connected for this project"));
        String token = decrypt(connection.getEncryptedAccessToken());
        HttpHeaders headers = githubHeaders(token);
        JsonNode commits = githubGet("/repos/" + connection.getOwner() + "/" + connection.getRepository() + "/commits?per_page=6", headers);
        JsonNode pulls = githubGet("/repos/" + connection.getOwner() + "/" + connection.getRepository() + "/pulls?state=all&sort=updated&direction=desc&per_page=6", headers);
        List<Map<String, Object>> commitList = new ArrayList<>();
        for (JsonNode commit : commits) {
            commitList.add(Map.of(
                    "sha", text(commit, "sha").substring(0, Math.min(7, text(commit, "sha").length())),
                    "url", text(commit, "html_url"),
                    "message", text(commit.path("commit"), "message").split("\\n", 2)[0],
                    "author", valueOr(text(commit.path("author"), "login"), text(commit.path("commit").path("author"), "name"), "Unknown author"),
                    "date", text(commit.path("commit").path("author"), "date")));
        }
        List<Map<String, Object>> pullList = new ArrayList<>();
        for (JsonNode pull : pulls) {
            pullList.add(Map.of(
                    "number", pull.path("number").asInt(),
                    "url", text(pull, "html_url"),
                    "title", text(pull, "title"),
                    "author", valueOr(text(pull.path("user"), "login"), "Unknown author"),
                    "status", pull.hasNonNull("merged_at") ? "MERGED" : text(pull, "state").toUpperCase(Locale.ROOT),
                    "updatedAt", text(pull, "updated_at")));
        }
        List<Map<String, Object>> events = eventRepository.findTop20ByProjectIdOrderByReceivedAtDesc(projectId).stream()
                .map(event -> Map.<String, Object>of(
                        "event", event.getEvent(),
                        "action", valueOr(event.getAction(), ""),
                        "title", valueOr(event.getTitle(), event.getRepository()),
                        "actor", valueOr(event.getActor(), "GitHub"),
                        "url", valueOr(event.getUrl(), ""),
                        "receivedAt", event.getReceivedAt().toString()))
                .toList();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("repositoryUrl", connection.getRepositoryUrl());
        result.put("commits", commitList);
        result.put("prs", pullList);
        result.put("events", events);
        result.put("webhookActive", connection.getWebhookId() != null && connection.getWebhookError() == null);
        result.put("webhookError", connection.getWebhookError());
        result.put("lastWebhookAt", connection.getLastWebhookAt() == null ? null : connection.getLastWebhookAt().toString());
        result.put("lastWebhookEvent", connection.getLastWebhookEvent());
        result.put("syncedAt", Instant.now().toString());
        return result;
    }

    public void disconnect(String projectId) {
        connectionRepository.findByProjectId(projectId).ifPresent(connection -> {
            try {
                if (connection.getWebhookId() != null) {
                    removeRemoteWebhook(connection, decrypt(connection.getEncryptedAccessToken()));
                }
            } catch (RuntimeException ignored) {
                // Local disconnect must still succeed when GitHub is unavailable.
            }
            connectionRepository.delete(connection);
        });
        eventRepository.deleteByProjectId(projectId);
        projectService.updateRepositoryUrl(projectId, null);
    }

    public void receiveWebhook(String connectionId, String eventName, String signature, byte[] body) {
        if (body.length > 1_000_000) throw new ResponseStatusException(PAYLOAD_TOO_LARGE, "Webhook payload is too large");
        GitHubConnection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Unknown GitHub webhook"));
        String secret = decrypt(connection.getEncryptedWebhookSecret());
        if (!validSignature(body, signature, secret)) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid GitHub webhook signature");
        }
        try {
            JsonNode payload = objectMapper.readTree(body);
            GitHubWebhookEvent event = new GitHubWebhookEvent();
            event.setProjectId(connection.getProjectId());
            event.setRepository(text(payload.path("repository"), "full_name"));
            event.setEvent(valueOr(eventName, "unknown"));
            event.setAction(text(payload, "action"));
            JsonNode subject = payload.has("pull_request") ? payload.path("pull_request")
                    : payload.has("issue") ? payload.path("issue") : payload;
            if (subject.has("commits")) {
                JsonNode commits = subject.path("commits");
                subject = commits.isArray() && !commits.isEmpty() ? commits.get(commits.size() - 1) : subject;
            }
            event.setTitle(valueOr(text(subject, "title"), text(subject, "message"), event.getEvent()));
            event.setUrl(valueOr(text(subject, "html_url"), text(subject, "url"), ""));
            event.setActor(valueOr(text(payload.path("sender"), "login"), "GitHub"));
            event.setReceivedAt(Instant.now());
            eventRepository.save(event);
            connection.setLastWebhookAt(event.getReceivedAt());
            connection.setLastWebhookEvent(event.getEvent() + (event.getAction() == null ? "" : "." + event.getAction()));
            connectionRepository.save(connection);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid GitHub webhook payload");
        }
    }

    private String exchangeCode(String code) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, String> body = Map.of("client_id", clientId, "client_secret", clientSecret, "code", code);
            JsonNode response = restTemplate.postForObject("https://github.com/login/oauth/access_token", new HttpEntity<>(body, headers), JsonNode.class);
            String token = text(response, "access_token");
            if (token.isBlank()) throw new ResponseStatusException(UNAUTHORIZED, "GitHub did not issue an access token");
            return token;
        } catch (RestClientException exception) {
            throw new ResponseStatusException(BAD_GATEWAY, "Could not exchange the GitHub authorization code");
        }
    }

    private void verifyRepositoryAccess(RepositoryCoordinates repo, String token) {
        githubGet("/repos/" + repo.owner() + "/" + repo.repository(), githubHeaders(token));
    }

    private void configureWebhook(GitHubConnection connection, String token) {
        if (webhookPublicUrl == null || webhookPublicUrl.isBlank()) {
            connection.setWebhookError("Set GITHUB_WEBHOOK_PUBLIC_URL to enable delivery.");
            connectionRepository.save(connection);
            return;
        }
        if (!webhookPublicUrl.startsWith("https://")) {
            connection.setWebhookError("GITHUB_WEBHOOK_PUBLIC_URL must use HTTPS.");
            connectionRepository.save(connection);
            return;
        }
        String secret = randomHex(32);
        String endpoint = webhookPublicUrl.replaceAll("/$", "") + "/github/webhook/" + connection.getId();
        Map<String, Object> hook = Map.of(
                "name", "web",
                "active", true,
                "events", List.of("push", "pull_request"),
                "config", Map.of("url", endpoint, "content_type", "json", "secret", secret, "insecure_ssl", "0"));
        try {
            HttpHeaders headers = githubHeaders(token);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(hook, headers);
            ResponseEntity<JsonNode> response;
            if (connection.getWebhookId() != null) {
                response = restTemplate.exchange(GITHUB_API + "/repos/" + connection.getOwner() + "/" + connection.getRepository() + "/hooks/" + connection.getWebhookId(), HttpMethod.PUT, request, JsonNode.class);
            } else {
                response = restTemplate.exchange(GITHUB_API + "/repos/" + connection.getOwner() + "/" + connection.getRepository() + "/hooks", HttpMethod.POST, request, JsonNode.class);
            }
            if (response.getBody() == null || !response.getBody().hasNonNull("id")) {
                throw new IllegalStateException("GitHub did not return a webhook ID");
            }
            connection.setWebhookId(response.getBody().path("id").asLong());
            connection.setEncryptedWebhookSecret(encrypt(secret));
            connection.setWebhookError(null);
        } catch (Exception exception) {
            connection.setWebhookError("Repository connected, but webhook setup failed. Check the app's admin:repo_hook permission and public webhook URL.");
        }
        connectionRepository.save(connection);
    }

    private void removeRemoteWebhook(GitHubConnection connection, String token) {
        HttpHeaders headers = githubHeaders(token);
        restTemplate.exchange(GITHUB_API + "/repos/" + connection.getOwner() + "/" + connection.getRepository() + "/hooks/" + connection.getWebhookId(), HttpMethod.DELETE, new HttpEntity<>(headers), Void.class);
    }

    private JsonNode githubGet(String path, HttpHeaders headers) {
        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(GITHUB_API + path, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);
            return response.getBody() == null ? objectMapper.createArrayNode() : response.getBody();
        } catch (RestClientException exception) {
            throw new ResponseStatusException(BAD_GATEWAY, "GitHub API request failed; check the repository access and OAuth permissions");
        }
    }

    private HttpHeaders githubHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setAccept(List.of(MediaType.valueOf("application/vnd.github+json")));
        headers.set("X-GitHub-Api-Version", "2022-11-28");
        return headers;
    }

    private RepositoryCoordinates parseRepository(String url) {
        if (url == null) throw new ResponseStatusException(BAD_REQUEST, "Repository URL is required");
        var matcher = java.util.regex.Pattern.compile("^https://github\\.com/([\\w.-]+)/([\\w.-]+?)(?:\\.git)?/?$", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(url.trim());
        if (!matcher.matches()) throw new ResponseStatusException(BAD_REQUEST, "Enter a valid GitHub repository URL");
        return new RepositoryCoordinates(matcher.group(1), matcher.group(2));
    }

    private void ensureConfigured() {
        if (clientId.isBlank() || clientSecret.isBlank()) throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Configure GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET first");
        if (encryptionKey == null || encryptionKey.length() < 32) throw new ResponseStatusException(SERVICE_UNAVAILABLE, "GITHUB_TOKEN_ENCRYPTION_KEY must be at least 32 characters");
    }

    private String encrypt(String plaintext) {
        try {
            byte[] nonce = new byte[12];
            RANDOM.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, encryptionKeySpec(), new GCMParameterSpec(128, nonce));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[nonce.length + encrypted.length];
            System.arraycopy(nonce, 0, combined, 0, nonce.length);
            System.arraycopy(encrypted, 0, combined, nonce.length, encrypted.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception exception) {
            throw new IllegalStateException("Could not encrypt GitHub credentials", exception);
        }
    }

    private String decrypt(String encoded) {
        try {
            byte[] combined = Base64.getDecoder().decode(encoded);
            byte[] nonce = Arrays.copyOfRange(combined, 0, 12);
            byte[] encrypted = Arrays.copyOfRange(combined, 12, combined.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, encryptionKeySpec(), new GCMParameterSpec(128, nonce));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception exception) {
            throw new ResponseStatusException(SERVICE_UNAVAILABLE, "GitHub credential encryption key is invalid or changed");
        }
    }

    private SecretKeySpec encryptionKeySpec() throws Exception {
        byte[] key = MessageDigest.getInstance("SHA-256").digest(encryptionKey.getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(key, "AES");
    }

    private boolean validSignature(byte[] payload, String signature, String secret) {
        if (signature == null || !signature.startsWith("sha256=")) return false;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = "sha256=" + HexFormat.of().formatHex(mac.doFinal(payload));
            return MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII), signature.getBytes(StandardCharsets.US_ASCII));
        } catch (Exception exception) {
            return false;
        }
    }

    private String frontendRedirect(String result) {
        return UriComponentsBuilder.fromUriString(frontendUrl).path("/repository").queryParam("github", result).build().encode().toUriString();
    }

    private String randomHex(int bytes) {
        byte[] value = new byte[bytes];
        RANDOM.nextBytes(value);
        return HexFormat.of().formatHex(value);
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        return value == null || value.isNull() ? "" : value.asText("");
    }

    private String valueOr(String first, String second) {
        return first == null || first.isBlank() ? second : first;
    }

    private String valueOr(String first, String second, String fallback) {
        return first != null && !first.isBlank() ? first : second != null && !second.isBlank() ? second : fallback;
    }

    private record RepositoryCoordinates(String owner, String repository) { }
    private record OAuthState(String projectId, String repositoryUrl, String userId, Instant expiresAt) { }
}
