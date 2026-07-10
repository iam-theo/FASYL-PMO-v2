import React from "react";
import { useAuth } from "../../contexts/AuthContext.tsx";

interface PermissionGuardProps {
  permissions?: string | string[];
  roles?: string | string[];
  logical?: "AND" | "OR";
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permissions,
  roles,
  logical = "AND",
  fallback = null,
  children,
}) => {
  const { hasPermission, hasRole, securityProfile } = useAuth();

  // If auth is loading or not authenticated, don't show yet
  if (!securityProfile) {
    return <>{fallback}</>;
  }

  const checkPermissionArray = (perms: string | string[]): boolean => {
    const array = Array.isArray(perms) ? perms : [perms];
    if (logical === "AND") {
      return array.every((p) => hasPermission(p));
    } else {
      return array.some((p) => hasPermission(p));
    }
  };

  const checkRoleArray = (roleCodes: string | string[]): boolean => {
    const array = Array.isArray(roleCodes) ? roleCodes : [roleCodes];
    if (logical === "AND") {
      return array.every((r) => hasRole(r));
    } else {
      return array.some((r) => hasRole(r));
    }
  };

  let isAuthorized = true;

  if (permissions) {
    isAuthorized = checkPermissionArray(permissions);
  }

  if (roles && isAuthorized) {
    isAuthorized = checkRoleArray(roles);
  }

  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface RoleGuardProps {
  roles: string | string[];
  logical?: "AND" | "OR";
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  roles,
  logical = "AND",
  fallback = null,
  children,
}) => {
  return (
    <PermissionGuard roles={roles} logical={logical} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
};
