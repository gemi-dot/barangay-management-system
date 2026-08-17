/** @param {(capability: string) => boolean} can */
export function householdPermissions(can) {
  return {
    view: can("household.view"),
    manage: can("household.manage"),
    changeHead: can("household.change_head"),
    viewFamily: can("family.view"),
    manageFamily: can("family.manage"),
  };
}

/** @param {string | undefined} status @param {ReturnType<typeof householdPermissions>} permissions */
export function canReactivateHousehold(status, permissions) {
  return permissions.manage && ["inactive", "archived", "transferred"].includes(status);
}
