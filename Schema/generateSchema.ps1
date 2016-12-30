$generatorPath = "C:\src\mseng\AppInsights-Common"
$publicSchemaLocation = "https://raw.githubusercontent.com/Microsoft/ApplicationInsights-Home/master/EndpointSpecs/Schemas/Bond"


$currentDir = $scriptPath = split-path -parent $MyInvocation.MyCommand.Definition
#fix path
$generatorPath = "$generatorPath\..\bin\Debug\BondSchemaGenerator\BondSchemaGenerator"


#####################################################################
## PUBLIC SCHEMA
#####################################################################

mkdir -Force $currentDir\PublicSchema

del "$currentDir\PublicSchema\*.bond"

$argumentList = ""

# Download public schema from the github
@(
"AvailabilityData.bond",
"Base.bond",
"ContextTagKeys.bond",
"Data.bond", 
"DataPoint.bond", 
"DataPointType.bond", 
"Domain.bond", 
"Envelope.bond", 
"EventData.bond", 
"ExceptionData.bond", 
"ExceptionDetails.bond", 
"MessageData.bond", 
"MetricData.bond", 
"PageViewData.bond", 
"RemoteDependencyData.bond", 
"RequestData.bond", 
"SeverityLevel.bond", 
"StackFrame.bond"
)  | ForEach-Object { 
    $fileName = $_
    $argumentList = "$argumentList -i $currentDir\PublicSchema\$fileName"
    & Invoke-WebRequest -o "$currentDir\PublicSchema\$fileName" "$publicSchemaLocation/$fileName"
}

$argumentList = "-v $argumentList -o $currentDir\PublicSchema\ -e TypeScriptDeclarationLanguage -t TypeScriptDeclarationLayout -n AI --flatten true"

# Generate public schema using bond generator
$p1 = Start-Process "$generatorPath\BondSchemaGenerator.exe"  -ArgumentList $argumentList -wait -NoNewWindow -PassThru 
$p1.HasExited
$p1.ExitCode

del "$currentDir\..\Declarations\applicationInsights\*.ts"

dir "$currentDir\PublicSchema\Contracts\Generated\*.ts" | ForEach-Object { 
    $fileName = $_
    copy $fileName "$currentDir\..\Declarations\applicationInsights\"
}

del "$currentDir\PublicSchema\Contracts\Generated\*.ts"