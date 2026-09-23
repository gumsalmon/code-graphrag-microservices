param(
    [Parameter(Mandatory = $true)]
    [string]$RunDirectory,
    [string]$OutputPath = "",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$runRoot = (Resolve-Path -LiteralPath $RunDirectory).Path
$summaryPath = Join-Path $runRoot "summary.json"
$environmentPath = Join-Path $runRoot "environment.json"
$commandsPath = Join-Path $runRoot "commands.log"
$scenarioPath = Join-Path $repositoryRoot "benchmark/p01/scenario.json"

foreach ($requiredPath in @($summaryPath, $environmentPath, $commandsPath, $scenarioPath)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required benchmark input is missing: $requiredPath"
    }
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $resultDirectory = Join-Path $repositoryRoot "benchmark/p01/derived/results"
    $runName = Split-Path -Leaf $runRoot
    $OutputPath = Join-Path $resultDirectory "$runName-benchmark-result.json"
}
elseif (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath = Join-Path $repositoryRoot $OutputPath
}

$outputParent = Split-Path -Parent $OutputPath
$null = New-Item -ItemType Directory -Force -Path $outputParent
if ((Test-Path -LiteralPath $OutputPath) -and (-not $Force)) {
    throw "Output already exists. Use -Force to replace it: $OutputPath"
}

function Read-JsonFile {
    param([string]$Path)
    return Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
}

function Convert-ResponseBody {
    param([object]$Observation)
    if (($null -eq $Observation) -or [string]::IsNullOrWhiteSpace([string]$Observation.body)) {
        return $null
    }
    try {
        return [string]$Observation.body | ConvertFrom-Json
    }
    catch {
        return [string]$Observation.body
    }
}

function Get-DirectVisitCount {
    param([object]$Body)
    if (($null -eq $Body) -or ($Body -is [string])) {
        return $null
    }
    if ($Body.PSObject.Properties.Name -notcontains "items") {
        return $null
    }
    return @($Body.items).Count
}

function Get-GatewayVisitCount {
    param([object]$Body)
    if (($null -eq $Body) -or ($Body -is [string])) {
        return $null
    }
    if ($Body.PSObject.Properties.Name -notcontains "pets") {
        return $null
    }
    $visitCount = 0
    foreach ($pet in @($Body.pets)) {
        $visitCount += @($pet.visits).Count
    }
    return $visitCount
}

function Convert-ToCanonicalJson {
    param([object]$Value)
    if ($null -eq $Value) {
        return "null"
    }
    if ($Value -is [string]) {
        return $Value
    }
    return $Value | ConvertTo-Json -Compress -Depth 30
}

function New-CandidateLabel {
    param(
        [string]$LabelId,
        [string]$Level,
        [string]$EntityId,
        [string]$Polarity,
        [object]$BehavioralImpact,
        [object]$RequiresCodeChange,
        [AllowNull()][Nullable[int]]$LogicalHop,
        [int]$ServiceBoundaryCrossings,
        [string]$Confidence,
        [string]$ReviewStatus,
        [string]$Rationale,
        [string[]]$EvidenceRefs
    )

    return [ordered]@{
        label_id = $LabelId
        level = $Level
        entity_id = $EntityId
        polarity = $Polarity
        behavioral_impact = $BehavioralImpact
        requires_code_change = $RequiresCodeChange
        logical_hop = $LogicalHop
        service_boundary_crossings = $ServiceBoundaryCrossings
        confidence = $Confidence
        review_status = $ReviewStatus
        rationale = $Rationale
        evidence_refs = $EvidenceRefs
    }
}

$summary = Read-JsonFile -Path $summaryPath
$environment = Read-JsonFile -Path $environmentPath
$scenario = Read-JsonFile -Path $scenarioPath

$observations = @(
    $summary.baseline_direct,
    $summary.baseline_gateway,
    $summary.baseline_negative,
    $summary.mutated_missing,
    $summary.mutated_valid,
    $summary.mutated_gateway,
    $summary.mutated_negative
)

$runtimeComplete = @(
    $observations | Where-Object {
        ($null -eq $_) -or
        ([int]$_.exit_code -ne 0) -or
        ($null -eq $_.http_status)
    }
).Count -eq 0

$baselineDirectBody = Convert-ResponseBody -Observation $summary.baseline_direct
$mutatedValidBody = Convert-ResponseBody -Observation $summary.mutated_valid
$baselineGatewayBody = Convert-ResponseBody -Observation $summary.baseline_gateway
$mutatedGatewayBody = Convert-ResponseBody -Observation $summary.mutated_gateway
$baselineNegativeBody = Convert-ResponseBody -Observation $summary.baseline_negative
$mutatedNegativeBody = Convert-ResponseBody -Observation $summary.mutated_negative

$baselineDirectVisits = Get-DirectVisitCount -Body $baselineDirectBody
$mutatedValidVisits = Get-DirectVisitCount -Body $mutatedValidBody
$baselineGatewayVisits = Get-GatewayVisitCount -Body $baselineGatewayBody
$mutatedGatewayVisits = Get-GatewayVisitCount -Body $mutatedGatewayBody
$baselineNegativeCanonical = Convert-ToCanonicalJson -Value $baselineNegativeBody
$mutatedNegativeCanonical = Convert-ToCanonicalJson -Value $mutatedNegativeBody

$directContractChanged =
    ([int]$summary.baseline_direct.http_status -eq 200) -and
    ([int]$summary.mutated_missing.http_status -eq 400) -and
    ([int]$summary.mutated_valid.http_status -eq 200) -and
    ($baselineDirectVisits -eq $mutatedValidVisits)

$gatewayBehaviorChanged =
    ([int]$summary.baseline_gateway.http_status -eq 200) -and
    ([int]$summary.mutated_gateway.http_status -eq 200) -and
    ($baselineGatewayVisits -gt $mutatedGatewayVisits)

$negativeUnchanged =
    ([int]$summary.baseline_negative.http_status -eq 200) -and
    ([int]$summary.mutated_negative.http_status -eq 200) -and
    ($baselineNegativeCanonical -ceq $mutatedNegativeCanonical)

$routingProof = Select-String -LiteralPath $commandsPath -SimpleMatch "gateway discovery preflight reached mutated visits-service" -Quiet
$acceptanceEligibleRuntime = $runtimeComplete -and $directContractChanged -and $gatewayBehaviorChanged -and $negativeUnchanged -and $routingProof
$auditDecision = if ($acceptanceEligibleRuntime) { "pending_review" } else { "reproduce_required" }
$reviewStatus = if ($acceptanceEligibleRuntime) { "pending_review" } else { "runtime_incomplete" }
$confidence = if ($acceptanceEligibleRuntime) { "high" } else { "low" }
$positivePolarity = if ($acceptanceEligibleRuntime) { "positive" } else { "unresolved" }
$positiveImpact = if ($acceptanceEligibleRuntime) { $true } else { "unresolved" }
$negativePolarity = if ($negativeUnchanged) { "negative" } else { "unresolved" }
$negativeImpact = if ($negativeUnchanged) { $false } else { "unresolved" }

$repositoryId = "spring-petclinic-microservices@$($environment.baseline_commit)"
$candidateLabels = @(
    (New-CandidateLabel -LabelId "P01-METHOD-001" -Level "method" -EntityId "$repositoryId::api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#getVisitsForPets(java.util.List<java.lang.Integer>)" -Polarity $positivePolarity -BehavioralImpact $positiveImpact -RequiresCodeChange $(if ($acceptanceEligibleRuntime) { $true } else { "unresolved" }) -LogicalHop 1 -ServiceBoundaryCrossings 1 -Confidence $confidence -ReviewStatus $reviewStatus -Rationale "Rule P01-CONSUMER: the client omits includeDetails and the routed patched request fails the provider contract." -EvidenceRefs @("runtime.direct_contract", "runtime.gateway_routing")),
    (New-CandidateLabel -LabelId "P01-METHOD-002" -Level "method" -EntityId "$repositoryId::api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#getOwnerDetails(int)" -Polarity $positivePolarity -BehavioralImpact $positiveImpact -RequiresCodeChange $(if ($acceptanceEligibleRuntime) { $false } else { "unresolved" }) -LogicalHop 2 -ServiceBoundaryCrossings 1 -Confidence $confidence -ReviewStatus $reviewStatus -Rationale "Rule P01-CONTROLLER: gateway response content changes through the visits fallback." -EvidenceRefs @("runtime.gateway_behavior", "runtime.gateway_routing")),
    (New-CandidateLabel -LabelId "P01-API-001" -Level "api" -EntityId "$repositoryId::api-gateway::GET /api/gateway/owners/{ownerId}" -Polarity $positivePolarity -BehavioralImpact $positiveImpact -RequiresCodeChange $(if ($acceptanceEligibleRuntime) { $false } else { "unresolved" }) -LogicalHop 2 -ServiceBoundaryCrossings 1 -Confidence $confidence -ReviewStatus $reviewStatus -Rationale "Rule P01-GATEWAY-API: baseline and patched responses differ in total visit content." -EvidenceRefs @("runtime.gateway_behavior", "runtime.gateway_routing")),
    (New-CandidateLabel -LabelId "P01-SERVICE-001" -Level "service" -EntityId "$repositoryId::api-gateway" -Polarity $positivePolarity -BehavioralImpact $positiveImpact -RequiresCodeChange $(if ($acceptanceEligibleRuntime) { $true } else { "unresolved" }) -LogicalHop 1 -ServiceBoundaryCrossings 1 -Confidence $confidence -ReviewStatus $reviewStatus -Rationale "Rule P01-SERVICE: the service owns the impacted direct consumer." -EvidenceRefs @("runtime.direct_contract", "runtime.gateway_behavior")),
    (New-CandidateLabel -LabelId "P01-METHOD-NEG-001" -Level "method" -EntityId "$repositoryId::visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(int)" -Polarity $negativePolarity -BehavioralImpact $negativeImpact -RequiresCodeChange $(if ($negativeUnchanged) { $false } else { "unresolved" }) -LogicalHop $null -ServiceBoundaryCrossings 0 -Confidence $confidence -ReviewStatus $reviewStatus -Rationale "Rule P01-NEGATIVE: same-class overload returns the same body before and after the patch." -EvidenceRefs @("runtime.negative_control")),
    (New-CandidateLabel -LabelId "P01-API-NEG-001" -Level "api" -EntityId "$repositoryId::visits-service::GET /owners/*/pets/{petId}/visits" -Polarity $negativePolarity -BehavioralImpact $negativeImpact -RequiresCodeChange $(if ($negativeUnchanged) { $false } else { "unresolved" }) -LogicalHop $null -ServiceBoundaryCrossings 0 -Confidence $confidence -ReviewStatus $reviewStatus -Rationale "Rule P01-NEGATIVE: control endpoint remains behaviorally identical." -EvidenceRefs @("runtime.negative_control"))
)

$relativeRunPath = [System.IO.Path]::GetRelativePath($repositoryRoot, $runRoot).Replace("\", "/")
$result = [ordered]@{
    schema_version = "0.1.0"
    result_kind = "automated_benchmark_observation_and_candidate_labels"
    scenario_id = [string]$scenario.scenario_id
    scenario_version = [string]$scenario.scenario_version
    protocol_version = [string]$scenario.protocol_version
    generated_at = Get-Date -Format "o"
    generator = [ordered]@{
        script = "scripts/export_p01_benchmark_json.ps1"
        ruleset = "P01-v1"
        automated = $true
        limitation = "Candidate labels are deterministic scenario-rule output, not independently reviewed ground truth"
    }
    audit_decision = $auditDecision
    ground_truth_status = "not_accepted"
    reviewer = $null
    source_run = $relativeRunPath
    inputs = [ordered]@{
        repository = [string]$environment.repository
        baseline_commit = [string]$environment.baseline_commit
        config_revision = [string]$environment.config_revision
        patch_sha256 = [string]$environment.patch_sha256
        baseline_visits_image = [string]$environment.baseline_visits_image
        mutated_visits_image = [string]$environment.mutated_visits_image
        fixture = $environment.fixture
    }
    observed_results = $observations
    derived_metrics = [ordered]@{
        baseline_direct_visit_count = $baselineDirectVisits
        mutated_valid_visit_count = $mutatedValidVisits
        baseline_gateway_visit_count = $baselineGatewayVisits
        mutated_gateway_visit_count = $mutatedGatewayVisits
    }
    comparisons = @(
        [ordered]@{
            comparison_id = "runtime.direct_contract"
            passed = $directContractChanged
            rule = "baseline=200, patched missing parameter=400, patched valid parameter=200 with same visit count"
        },
        [ordered]@{
            comparison_id = "runtime.gateway_behavior"
            passed = $gatewayBehaviorChanged
            rule = "baseline and patched gateway status=200, patched total visit count is lower"
        },
        [ordered]@{
            comparison_id = "runtime.gateway_routing"
            passed = [bool]$routingProof
            rule = "gateway discovery preflight reaches the recreated patched visits service"
        },
        [ordered]@{
            comparison_id = "runtime.negative_control"
            passed = $negativeUnchanged
            rule = "negative endpoint status and canonical response body are identical"
        }
    )
    seed = [ordered]@{
        excluded_from_scoring = $true
        service = "visits-service"
        method_before = "org.springframework.samples.petclinic.visits.web.VisitResource#read(java.util.List<java.lang.Integer>)"
        method_after = "org.springframework.samples.petclinic.visits.web.VisitResource#read(java.util.List<java.lang.Integer>,boolean)"
        api = "GET /pets/visits"
    }
    candidate_labels = $candidateLabels
    acceptance_gate = [ordered]@{
        runtime_complete = $runtimeComplete
        scenario_rules_passed = $acceptanceEligibleRuntime
        independent_reviewer_required = $true
        accepted = $false
    }
}

$result | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $OutputPath -Encoding utf8
$outputHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $OutputPath).Hash.ToLower()
$relativeOutputPath = [System.IO.Path]::GetRelativePath($repositoryRoot, (Resolve-Path -LiteralPath $OutputPath).Path).Replace("\", "/")
$checksumPath = "$OutputPath.sha256"
"$outputHash  $relativeOutputPath" | Set-Content -LiteralPath $checksumPath -Encoding utf8

Write-Output "Benchmark JSON: $OutputPath"
Write-Output "SHA-256: $outputHash"
Write-Output "Decision: $auditDecision"

