package com.neuroforge.user.github;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.util.Map;

@RestController
public class GitHubController {
    private final GitHubIntegrationService gitHubService;

    @Value("${github.oauth.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public GitHubController(GitHubIntegrationService gitHubService) {
        this.gitHubService = gitHubService;
    }

    @PostMapping("/github/oauth/authorize")
    public ResponseEntity<Map<String, String>> beginOAuth(@RequestBody Map<String, String> request,
                                                           org.springframework.security.core.Authentication authentication) {
        return ResponseEntity.ok(gitHubService.beginOAuth(
                request.get("projectId"), request.get("repositoryUrl"), authentication.getName()));
    }

    @GetMapping("/github/oauth/callback")
    public ResponseEntity<Void> oauthCallback(@RequestParam(required = false) String code,
                                               @RequestParam(required = false) String state,
                                               @RequestParam(required = false) String error) {
        URI destination;
        if (error != null) {
            destination = frontendResult("error", error);
        } else {
            try {
                destination = URI.create(gitHubService.completeOAuth(code, state));
            } catch (Exception exception) {
                String message = exception instanceof ResponseStatusException statusException
                        ? statusException.getReason()
                        : "GitHub authorization could not be completed";
                destination = frontendResult("error", message);
            }
        }
        return ResponseEntity.status(HttpStatus.FOUND).header(HttpHeaders.LOCATION, destination.toString()).build();
    }

    @GetMapping("/projects/{projectId}/repository/activity")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER', 'TEAM_LEAD', 'DEVELOPER', 'DESIGNER', 'QA', 'EMPLOYEE')")
    public ResponseEntity<Map<String, Object>> getActivity(@PathVariable String projectId) {
        return ResponseEntity.ok(gitHubService.fetchActivity(projectId));
    }

    @DeleteMapping("/projects/{projectId}/repository")
    public ResponseEntity<Void> disconnect(@PathVariable String projectId) {
        gitHubService.disconnect(projectId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/github/webhook/{connectionId}")
    public ResponseEntity<Void> receiveWebhook(@PathVariable String connectionId,
                                               @RequestHeader(value = "X-GitHub-Event", required = false) String event,
                                               @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
                                               HttpServletRequest request) throws IOException {
        byte[] body = request.getInputStream().readNBytes(1_000_001);
        gitHubService.receiveWebhook(connectionId, event, signature, body);
        return ResponseEntity.accepted().build();
    }

    private URI frontendResult(String status, String message) {
        return UriComponentsBuilder.fromUriString(frontendUrl)
                .path("/repository")
                .queryParam("github", status)
                .queryParam("message", message)
                .build().encode().toUri();
    }
}
