#### __Apps__

`Apps` contains default Node.js projects.
- Each project pair has a version with the AI SDK installed (via npm), and a version without it.
- Each application returns its own name as part of the Home/Contact page payload.
- During perf run each application in the pair is deployed in turns into the same App Service as per PublishProrile under Properties folder.

#### __Scripts__

`Scripts` contains `.\test.ps1` that encapsulates Perf test logic:

- Takes names of the projects to test and app service name to deploy;
- Builds a project matching the name;
- Deploys a project matching the name using Publish Profile (`<ProjectName>.pubxml`) and PublishSettings (`<ProjectName>.PublishSettings`);
- Validates that the right project is deployed by checking payload of Home/Contact page;
- Runs WCAT tool using configuration file matching the app service name provided (`<AppServiceName>.ubr`);
- Alternates the projects and starts over;
- Repeats the above N times and produces `<RunID>.xml` output file for each.

#### __Setup__

- Create S1 App Service in Azure Portal;
- Export `*.PublishSettings` file (right-click on the App Service in Visual Studio Cloud Exporer);
- Build `Apps` and change Publish template from *dmitmatvperf* to your App Service;
- Modify `.\test.ps1` to change paths to `.publishsettings`, `.pubxml`, `.csproj` files;
- Modify `.ubr` file name and file content to match your service name by replacing *dmitmatvperf*;
- Install WCAT UI tool, copy modified content of `Scipts` into the WCAT UI tool folder next to `*.exe`;
- Modify names of the projects you are about to test in "GreenField" scenario inside `.\test.ps1` (default is *ASPNETPerf_NoAI* & *ASPNETPerf_GreenFieldAI*), please note: "NoAI" and "GreenField" are necessary strings to differentiate between those cases in the runs and in the analysis step;
- Run `.\test.ps1`


#### __Parse Results__
- Open `perf-pasrse.linq` in *LINQPAD*;
- Modify the expected folder location in the script to look for `.xml` run results;
- Modify the time frame in the script to look for the results of the required runs only;
- Run the script to get a comparison table of app performance with and without AI;

#### __Profiling__
- Install the latest version of Geneva Monitoring agent or Geneva Monitoring Nuget and copy `AzureProfilerExtension` folder over to an appropriate location
- Remove blob upload configuration XML file from that folder;
- Change `\test.ps1` methods `profile-*` with the folder path to the profiler
- [Deploy test applications locally in IIS](https://docs.microsoft.com/en-us/aspnet/core/host-and-deploy/iis/?view=aspnetcore-2.2#create-the-iis-site). Folder Publish Profiles were added to the apps to simplify this step. Use the same port, different sites, different host name (matching the test app name), e.g. AIPerfNetCore_NoAI and AIPerfNetCore_GreenFieldAI
- Change C:\Windows\System32\drivers\ect\hosts file to resolve those site names to localhost, e.g. `127.0.0.1 AIPerfNetCore_NoAI`
- Local Run option will now work in `.\test.ps1`

#### __Additional Features__
`\test.ps1` and `perf-parse.linq` also contain support for RedField scenario that modifies app service settings directly to enable AI.
 Please experiment and enhance this documentation :)
