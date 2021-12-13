export interface IMetricBaseDimensions {
    cloudRoleInstance?: string;
    cloudRoleName?: string
}

export interface IMetricDependencyDimensions extends IMetricBaseDimensions {
    dependencyType?: string;
    dependencyTarget?: string;
    dependencySuccess?: boolean;
    dependencyResultCode?: string;
    operationSynthetic?: string;
}

export interface IMetricRequestDimensions extends IMetricBaseDimensions {
    requestSuccess?: boolean;
    requestResultCode?: string;
    operationSynthetic?: string;
}

export interface IMetricExceptionDimensions extends IMetricBaseDimensions {
}

export interface IMetricTraceDimensions extends IMetricBaseDimensions {
    traceSeverityLevel?: string;
}

export type MetricDimensionTypeKeys = "cloudRoleInstance" | "cloudRoleName" | "requestSuccess" | "requestResultCode"
    | "dependencyType" | "dependencyTarget" | "dependencySuccess" | "dependencyResultCode" | "traceSeverityLevel" | "operationSynthetic";


