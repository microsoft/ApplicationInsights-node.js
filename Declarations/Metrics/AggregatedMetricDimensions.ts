export interface MetricBaseDimensions {
    cloudRoleInstance?: string;
    cloudRoleName?: string
}

export interface MetricDependencyDimensions extends MetricBaseDimensions {
    dependencyType?: string;
    dependencyTarget?: string;
    dependencySuccess?: boolean;
    dependencyResultCode?: string;
}

export interface MetricRequestDimensions extends MetricBaseDimensions {
    requestSuccess?: boolean;
    requestResultCode?: string;
}

export interface MetricExceptionDimensions extends MetricBaseDimensions {
}

export interface MetricTraceDimensions extends MetricBaseDimensions {
}

export type MetricDimensionTypeKeys = "cloudRoleInstance" | "cloudRoleName" | "requestSuccess" | "requestResultCode"
    | "dependencyType" | "dependencyTarget" | "dependencySuccess" | "dependencyResultCode";

// Names expected in Breeze side for dimensions
export const PreaggregatedMetricPropertyNames: { [key in MetricDimensionTypeKeys]: string } = {
    cloudRoleInstance: "cloud/roleInstance",
    cloudRoleName: "cloud/roleName",
    requestSuccess: "Request.Success",
    requestResultCode: "request/resultCode",
    dependencyType: "Dependency.Type",
    dependencyTarget: "dependency/target",
    dependencySuccess: "Dependency.Success",
    dependencyResultCode: "dependency/resultCode",
};
