export interface MetricBaseDimensions {
    cloudRoleInstance?: string;
    cloudRoleName?: string;
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
export declare type MetricDimensionTypeKeys = "cloudRoleInstance" | "cloudRoleName" | "requestSuccess" | "requestResultCode" | "dependencyType" | "dependencyTarget" | "dependencySuccess" | "dependencyResultCode" | "traceSeverityLevel" | "operationSynthetic";
export declare const PreaggregatedMetricPropertyNames: {
    [key in MetricDimensionTypeKeys]: string;
};
