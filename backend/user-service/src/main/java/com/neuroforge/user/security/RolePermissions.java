package com.neuroforge.user.security;

import com.neuroforge.user.model.Role;
import java.util.*;

public class RolePermissions {

    private static final Map<Role, Set<String>> PERMISSIONS = Map.of(
        Role.ADMIN, Set.of("project:create", "project:delete", "user:manage", "sprint:edit"),
        Role.PROJECT_MANAGER, Set.of("project:create", "sprint:edit", "milestone:edit"),
        Role.DEVELOPER, Set.of("task:edit", "sprint:view"),
        Role.TESTER, Set.of("task:view", "task:edit"),
        Role.DEVOPS_ENGINEER, Set.of("pipeline:view", "deployment:edit")
    );

    public static boolean hasPermission(Role role, String permission) {
        return PERMISSIONS.getOrDefault(role, Set.of()).contains(permission);
    }
}