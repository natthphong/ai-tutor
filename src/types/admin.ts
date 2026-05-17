export type AdminSession = {
    sessionType: "admin" | string;
    actorType: "staff" | string;
    actorLabel: string;
    staffAccountId?: number | null;
    employeeId?: number | null;
    roles: string[];
    permissions: string[];
    branchIds: number[];
};
