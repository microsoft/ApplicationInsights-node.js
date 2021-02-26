export interface MetricBaseDimensions {
    [key: string]: string | number | boolean;
    cloudRoleInstance?: string;
    cloudRoleName?: string
}

export interface MetricDependencyDimensions extends MetricBaseDimensions {
    dependencyDuration?: number | string;
    dependencyType?: string;
    dependencyTarget?: string;
    dependencySuccess?: boolean;
    dependencyResultCode?: string;
}

export interface MetricRequestDimensions extends MetricBaseDimensions {
    requestDuration?: number | string;
    requestSuccess?: boolean;
    requestResultCode?: string;
}

export interface MetricExceptionDimensions extends MetricBaseDimensions {
}

export interface MetricTraceDimensions extends MetricBaseDimensions {
}

export type MetricDimensionTypeKeys = "cloudRoleInstance" | "cloudRoleName" | "requestSuccess" | "requestDuration" | "requestResultCode"
    | "dependencyDuration" | "dependencyType" | "dependencyTarget" | "dependencySuccess" | "dependencyResultCode";

// Names expected in Breeze side for dimensions
export const PreaggregatedMetricPropertyNames: { [key in MetricDimensionTypeKeys]: string } = {
    cloudRoleInstance: "cloud/roleInstance",
    cloudRoleName: "cloud/roleName",
    requestSuccess: "Request.Success",
    requestDuration: "requests/duration",
    requestResultCode: "request/resultCode",
    dependencyDuration: "dependencies/duration",
    dependencyType: "Dependency.Type",
    dependencyTarget: "dependency/target",
    dependencySuccess: "Dependency.Success",
    dependencyResultCode: "dependency/resultCode",
};
