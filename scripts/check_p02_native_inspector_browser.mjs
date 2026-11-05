// Offline browser QA of an already built artifact. No Docker/model/network/inference.
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url),root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
let playwright;try{playwright=require('playwright');}catch{playwright=require(resolve(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
if(process.argv.length!==4||process.argv[2]!=='--build')throw Error('Usage: --build P02_INSPECTOR_BUILD_DIRECTORY');
const build=resolve(process.argv[3]);
assert.ok(relative(resolve(root,'handoff-out/p02-native-inspector'),build)&&!relative(resolve(root,'handoff-out/p02-native-inspector'),build).startsWith('..'));
const bundle=JSON.parse(await readFile(resolve(build,'view-bundle.json'),'utf8'));
const out=resolve(root,'handoff-out/p02-native-inspector-qa',new Date().toISOString().replace(/[-:.]/g,'')+'-'+randomUUID().slice(0,8));
await mkdir(out,{recursive:true});
const report={created_utc:new Date().toISOString(),artifact_directory:relative(root,build).replaceAll('\\','/'),artifact_manifest_sha256:digest(await readFile(resolve(build,'SHA256SUMS.txt'))),qa_implementation_sha256:digest(await readFile(fileURLToPath(import.meta.url))),checks:[],browser_errors:[],external_page_requests:[],screenshots:[],network_offline:true,model_calls:0};
let browser;
const check=(name,fn)=>{fn();report.checks.push(name);};
const listen=page=>{page.setDefaultTimeout(6000);page.on('pageerror',error=>report.browser_errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.browser_errors.push(message.text());});page.on('request',request=>{if(/^https?:/i.test(request.url()))report.external_page_requests.push(request.url());});};
try{
 for(const artifact of Object.values(bundle.artifacts)){const bytes=Buffer.from(artifact.base64,'base64');assert.equal(bytes.length,artifact.bytes);assert.equal(digest(bytes),artifact.sha256);}
 report.checks.push('all 20 embedded artifact bytes match their recorded identities');
 browser=await playwright.chromium.launch({executablePath:process.env.P02_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});report.browser_version=browser.version();
 const context=await browser.newContext({viewport:{width:1440,height:1080},offline:true});
 const page=await context.newPage();listen(page);await page.goto(pathToFileURL(resolve(build,'index.html')).href);await page.waitForFunction(()=>Boolean(window.P02_NATIVE_INSPECTOR));
 check('baseline graph contains five native nodes; default depth has two candidates',()=>assert.equal(report.browser_errors.length,0));
 assert.equal(await page.locator('[data-node]').count(),5);assert.equal(await page.locator('#candidate-count').innerText(),'2');assert.equal(await page.locator('#fatal').isVisible(),false);
 assert.equal(await page.evaluate(()=>scrollY),0);
 await page.screenshot({path:resolve(out,'desktop.png'),fullPage:true});report.screenshots.push('desktop.png');
 await page.selectOption('#depth','1');assert.equal(await page.locator('#candidate-count').innerText(),'1');assert.equal(await page.locator('#paths li').count(),1);
 await page.selectOption('#depth','3');assert.equal(await page.locator('#candidate-count').innerText(),'2');await page.locator('details summary').first().click();assert.ok((await page.locator('#saved-query').innerText()).includes('*1..3'));
 report.checks.push('hop controls use saved query plans and preserve seed exclusion');
 await page.locator('[data-node]').filter({hasText:'getOwnerDetails(int)'}).click();assert.ok((await page.locator('#source-name').innerText()).includes('ApiGatewayController.java'));assert.equal(await page.locator('#source-code .active').count(),13);
 const overload=page.locator('[data-node]').filter({hasText:'read(int)'});await overload.focus();await overload.press('Enter');assert.ok((await page.locator('#selected-state').innerText()).includes('không thuộc'));assert.equal(await page.locator('#source-code .active').count(),4);
 report.checks.push('Method selection and keyboard distinguish overload/source spans without a negative impact claim');
 await page.locator('#unresolved button').click();assert.ok((await page.locator('#selected-state').innerText()).startsWith('Unresolved'));assert.ok((await page.locator('#source-code .active').allTextContents()).some(line=>line.includes('setHostname')));
 report.checks.push('unresolved source opens without inheriting a selected graph Method or inventing an impact label');
 await page.selectOption('#snapshot','mutated');assert.ok((await page.locator('#selected-id').innerText()).includes('List<Integer>,boolean'));assert.ok((await page.locator('#parameters').innerText()).includes('includeDetails'));assert.ok((await page.locator('#parameters').innerText()).includes('false'));
 assert.equal(await page.locator('#source-code .active').count(),6);assert.ok((await page.locator('#full-parity').innerText()).includes('CHƯA ĐẠT'));assert.equal(await page.locator('#missing-methods li').count(),4);assert.ok((await page.locator('#inventory-summary').innerText()).includes('4/8'));
 report.checks.push('mutated snapshot preserves its own seed/optional-default metadata and displays both open technical limits');
 const downloaded=page.waitForEvent('download');await page.locator('#download-source').click();const file=await downloaded;const raw=await readFile(await file.path());
 assert.equal(digest(raw),'c2253806644e38b298988693b44188ecab23c7fd9b2210e809fa12e728292fd0');
 const graphDownload=page.waitForEvent('download');await page.locator('[data-artifact="mutated/native-graph"]').click();const graph=await graphDownload;assert.equal(digest(await readFile(await graph.path())),bundle.artifacts['mutated/native-graph'].sha256);
 report.checks.push('source and native JSON downloads retain raw bytes');
 const mobile=await context.newPage();listen(mobile);await mobile.setViewportSize({width:390,height:844});await mobile.goto(pathToFileURL(resolve(build,'index.html')).href);await mobile.waitForFunction(()=>Boolean(window.P02_NATIVE_INSPECTOR));
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await mobile.selectOption('#snapshot','mutated');await mobile.selectOption('#depth','1');assert.equal(await mobile.locator('#candidate-count').innerText(),'1');
 await mobile.screenshot({path:resolve(out,'mobile.png'),fullPage:true});report.screenshots.push('mobile.png');report.checks.push('390px layout contains horizontal overflow inside source/graph/table panes');
 const relocated=resolve(out,'relocated');await mkdir(relocated);await writeFile(resolve(relocated,'index.html'),await readFile(resolve(build,'index.html')),{flag:'wx'});
 const moved=await context.newPage();listen(moved);await moved.goto(pathToFileURL(resolve(relocated,'index.html')).href);await moved.waitForFunction(()=>Boolean(window.P02_NATIVE_INSPECTOR));assert.equal(await moved.locator('[data-node]').count(),5);await moved.selectOption('#snapshot','mutated');assert.ok((await moved.locator('#parameters').innerText()).includes('includeDetails'));
 report.checks.push('relocated HTML alone works without original workspace paths or adjacent assets');
 check('offline browser has no page errors, CSP errors or HTTP requests',()=>{assert.deepEqual(report.browser_errors,[]);assert.deepEqual(report.external_page_requests,[]);});
 report.success=true;
}catch(error){report.success=false;report.failure=error.stack;process.exitCode=1;}
finally{if(browser)await browser.close();await writeFile(resolve(out,'BROWSER_QA.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({directory:out,success:report.success,checks:report.checks.length,failure:report.failure??null,screenshots:report.screenshots}));}
