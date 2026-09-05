package com.neuroforge.user.service;

import com.neuroforge.user.model.Team;

import com.neuroforge.user.repository.TeamRepository;
import com.neuroforge.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class TeamService {

    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    public TeamService(
            TeamRepository teamRepository,
            UserRepository userRepository
    ) {
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
    }

    public Team createTeam(Team team) {

        validateTeam(team);

        team.setId(null);
        team.setCreatedAt(LocalDate.now().toString());

        if (team.getMemberIds() == null) {
            team.setMemberIds(new ArrayList<>());
        }

        validateUsers(team.getLeadId(), team.getMemberIds());

        return teamRepository.save(team);
    }

    public List<Team> getAllTeams() {
        return teamRepository.findAll();
    }

    public Team getTeam(String id) {

        return teamRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Team not found"));
    }

    public Team updateTeam(String id, Team updatedTeam) {

        Team existingTeam = getTeam(id);

        validateTeam(updatedTeam);

        validateUsers(
                updatedTeam.getLeadId(),
                updatedTeam.getMemberIds()
        );

        existingTeam.setName(updatedTeam.getName());
        existingTeam.setDescription(updatedTeam.getDescription());
        existingTeam.setLeadId(updatedTeam.getLeadId());

        if (updatedTeam.getMemberIds() == null) {
            existingTeam.setMemberIds(new ArrayList<>());
        } else {
            existingTeam.setMemberIds(updatedTeam.getMemberIds());
        }

        return teamRepository.save(existingTeam);
    }

    public void deleteTeam(String id) {

        if (!teamRepository.existsById(id)) {
            throw new IllegalArgumentException("Team not found");
        }

        teamRepository.deleteById(id);
    }

    public Team addMember(String teamId, String userId) {

        Team team = getTeam(teamId);

        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("User not found");
        }

        if (team.getMemberIds() == null) {
            team.setMemberIds(new ArrayList<>());
        }

        if (!team.getMemberIds().contains(userId)) {
            team.getMemberIds().add(userId);
        }

        return teamRepository.save(team);
    }

    public Team removeMember(String teamId, String userId) {

        Team team = getTeam(teamId);

        if (team.getMemberIds() != null) {
            team.getMemberIds().remove(userId);
        }

        return teamRepository.save(team);
    }

    private void validateTeam(Team team) {

        if (team == null) {
            throw new IllegalArgumentException("Team data is required");
        }

        if (team.getName() == null || team.getName().isBlank()) {
            throw new IllegalArgumentException("Team name is required");
        }
    }

    private void validateUsers(
            String leadId,
            List<String> memberIds
    ) {

        if (leadId != null && !leadId.isBlank()) {

            if (!userRepository.existsById(leadId)) {
                throw new IllegalArgumentException(
                        "Team lead user not found"
                );
            }
        }

        if (memberIds != null) {

            for (String memberId : memberIds) {

                if (!userRepository.existsById(memberId)) {
                    throw new IllegalArgumentException(
                            "Team member not found: " + memberId
                    );
                }
            }
        }
    }
}