export interface MetricBaseDimensions {
    cloudRoleInstance?: string;
    cloudRoleName?: string
}

export interface MetricDependencyDimensions extends MetricBaseDimensions {
    dependencyType?: string;
    dependencyTarget?: string;
    dependencySuccess?: boolean;
    dependencyResultCode?: string;
    operationSynthetic?: string;
}

export interface MetricRequestDimensions extends MetricBaseDimensions {
    requestSuccess?: boolean;
    requestResultCode?: string;
    operationSynthetic?: string;
}

export interface MetricExceptionDimensions extends MetricBaseDimensions {
}

export interface MetricTraceDimensions extends MetricBaseDimensions {
    traceSeverityLevel?: string;
}

export type MetricDimensionTypeKeys = "cloudRoleInstance" | "cloudRoleName" | "requestSuccess" | "requestResultCode"
    | "dependencyType" | "dependencyTarget" | "dependencySuccess" | "dependencyResultCode" | "traceSeverityLevel" | "operationSynthetic";

// Names expected in Breeze side for dimensions
export const PreaggregatedMetricPropertyNames: { [key in MetricDimensionTypeKeys]: string } = {
    cloudRoleInstance: "cloud/roleInstance",
    cloudRoleName: "cloud/roleName",
    operationSynthetic: "operation/synthetic",
    requestSuccess: "Request.Success",
    requestResultCode: "request/resultCode",
    dependencyType: "Dependency.Type",
    dependencyTarget: "dependency/target",
    dependencySuccess: "Dependency.Success",
    dependencyResultCode: "dependency/resultCode",
    traceSeverityLevel: "trace/severityLevel"
};
