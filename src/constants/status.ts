import { isExpiredUTC } from "@/utils/time";

export type DisplayStatus =
    | "PENDING"
    | "PREPARE"
    | "READY"
    | "DELIVERY"
    | "COMPLETED"
    | "REJECTED"
    | "EXPIRED";

