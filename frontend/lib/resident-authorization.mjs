/** @param {(capability: string) => boolean} can */
export function residentPermissions(can) {
  return {
    viewBasic: can("resident.view_basic"),
    viewSensitive: can("resident.view_sensitive"),
    create: can("resident.create"),
    edit: can("resident.edit"),
    archive: can("resident.lifecycle_archive"),
    transfer: can("resident.lifecycle_transfer"),
    deceased: can("resident.lifecycle_deceased"),
    restore: can("resident.restore"),
    delete: can("resident.delete"),
  };
}

/** @param {{is_active?: boolean, residency_status?: string}} resident @param {ReturnType<typeof residentPermissions>} permissions */
export function availableResidentLifecycleActions(resident, permissions) {
  const status = resident.residency_status || (resident.is_active === false ? "inactive" : "active");
  return {
    archive: permissions.archive && status !== "archived" && status !== "deceased",
    transfer: permissions.transfer && status !== "transferred" && status !== "deceased",
    deceased: permissions.deceased && status !== "deceased",
    restore: permissions.restore && resident.is_active === false && status !== "deceased",
    delete: permissions.delete,
  };
}
