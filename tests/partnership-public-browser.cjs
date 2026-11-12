const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium, launchOptions } = require('./browser-runtime.cjs');
const root = path.resolve(__dirname, '..');
const site = path.join(root, 'site');
const output = process.env.GAMGEE_QA_OUTPUT || path.join(root, 'reports/partnership');
fs.mkdirSync(output, { recursive:true });
const result = { widths:[], checks:[], errors:[], realPosts:0 };
const fontCSS = (fs.readFileSync(path.join(site,'career/index.html'),'utf8').match(/@font-face\s*\{[^}]+\}/g)||[]).join('\n');
const sample = { firstName:'  Preview  ',lastName:'Reviewer',organisation:'Example research',email:'preview@example.org',phone:'',role:'Research institution',location:'',message:'  Mock inquiry only.  ' };
const server = http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(site,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(site+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch(launchOptions);
  try {
    async function setup(mode='ok', width=1440){
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
      await context.addInitScript((mode)=>{
        if(mode==='captcha_api_failure')return;
        window.__widgets=[];window.__reset=[];window.__captchaToken='mock-token';
        window.grecaptcha={render(container,options){const id=window.__widgets.length;window.__widgets.push({id,form:container.closest('form').id,size:options.size});const box=document.createElement('div');box.textContent='Security check (test widget)';box.style.cssText='box-sizing:border-box;width:'+ (options.size==='compact'?164:304)+'px;height:'+(options.size==='compact'?144:78)+'px;padding:14px;border:1px solid #ccc;border-radius:3px;background:#fafafa;font:13px Arial';container.appendChild(box);return id;},getResponse(id){return window.__captchaTokens ? window.__captchaTokens[id]||'' : window.__captchaToken;},reset(id){window.__reset.push(id);if(window.__captchaTokens)delete window.__captchaTokens[id];}};
      },mode);
      const posts=[];
      await context.route('**/*',async route=>{
        const req=route.request();const url=req.url();
        if(req.method()==='POST'){
          posts.push({url,body:JSON.parse(req.postData()),headers:req.headers()});
          if(mode==='network')return route.abort('failed');
          await new Promise(resolve=>setTimeout(resolve,100));
          const data=mode==='error'?{error:'Please try again.'}:mode==='empty'?{}:mode==='null'?null:{status:'ok'};
          return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
        }
        if(url.startsWith(base))return route.continue();
        if(mode==='captcha_api_failure' && url.includes('google.com/recaptcha/api.js'))return route.abort('failed');
        if(url.startsWith('https://fonts.googleapis.com/'))return route.fulfill({contentType:'text/css',body:fontCSS});
        if(/^https?:/.test(url))return route.fulfill({status:200,contentType:'text/javascript',body:''});
        return route.continue();
      });
      const page=await context.newPage();
      page.on('pageerror',e=>result.errors.push(e.message));
      await page.goto(base+'/partnership/',{waitUntil:'networkidle'});
      await page.evaluate(async()=>{await document.fonts.ready;document.querySelectorAll('img').forEach(i=>i.loading='eager');await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
      await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
      return {context,page,posts};
    }
    async function fill(page,values=sample){
      for(const [name,value] of Object.entries(values)){
        const field=page.locator('#partnershipForm [name="'+name+'"]');
        if(name==='role')await field.selectOption(value);else await field.fill(value);
      }
    }
    async function submit(page){await page.locator('#partnershipForm button[type="submit"]').click();}
    async function submitReferral(page){
      await page.locator('.js-open-referral').click();
      await page.waitForFunction(()=>window.__widgets.some(w=>w.form==='referralForm'));
      await page.evaluate(()=>{
        const form=document.getElementById('referralForm');for(const field of form.querySelectorAll('[required]')){
          if(field.type==='checkbox')field.checked=true;
          else if(field.tagName==='SELECT')field.value=[...field.options].find(o=>o.value&&!o.disabled).value;
          else field.value=field.type==='email'?'preview@example.org':field.type==='number'?'8':'Preview';
        }form.requestSubmit();form.requestSubmit();
      });
    }
    async function failureReady(page){await page.waitForFunction(()=>document.querySelector('#partnershipForm [data-form-feedback]').textContent.length>0 && document.getElementById('partnershipForm').getAttribute('aria-busy')!=='true');}
    const visual=await setup();
    assert.equal(await visual.page.locator('body').innerText().then(t=>/Shareable preview|Preview only/.test(t)),false);
    assert.equal(await visual.page.locator('nav a[href="/partnership/"]').first().innerText(),'Partnership');
    for(const width of [1920,1440,1200,1024,901,900,850,768,767,650,600,390,320]){
      await visual.page.setViewportSize({width,height:1000});
      await visual.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await visual.page.locator('#partnershipForm').scrollIntoViewIfNeeded();
      await visual.page.waitForFunction(()=>{
        const form=document.getElementById('partnershipForm'),s=getComputedStyle(form);
        const available=form.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight);
        const container=form.querySelector('.gamgee-recaptcha');
        const active=window.__widgets[Number(container.dataset.widgetId)];
        return active && active.size===(available>=304?'normal':'compact');
      });
      const controls=await visual.page.evaluate(()=>{
        const form=document.getElementById('partnershipForm'),s=getComputedStyle(form),r=form.getBoundingClientRect();
        const widget=form.querySelector('.gamgee-recaptcha > div:not([hidden])').getBoundingClientRect();
        const button=form.querySelector('button[type="submit"]').getBoundingClientRect();
        return {width:innerWidth,widgetWidth:widget.width,widgetHeight:widget.height,left:widget.left,right:widget.right,contentLeft:r.left+parseFloat(s.paddingLeft),contentRight:r.right-parseFloat(s.paddingRight),buttonTop:button.top,widgetBottom:widget.bottom};
      });
      assert.ok(controls.left>=controls.contentLeft-1 && controls.right<=controls.contentRight+1,JSON.stringify(controls));
      if(width===1440)assert.equal(controls.widgetWidth,304);
      if(width===390){assert.equal(controls.widgetWidth,304);assert.ok(controls.buttonTop>controls.widgetBottom);}
      if(width===320)assert.equal(controls.widgetWidth,164,JSON.stringify(controls));
      await visual.page.evaluate(()=>scrollTo(0,0));
      const geometry=await visual.page.evaluate(()=>{
        function bounds(selector){const el=document.querySelector(selector),r=el.getBoundingClientRect(),s=getComputedStyle(el);return {left:r.left+parseFloat(s.paddingLeft),right:r.right-parseFloat(s.paddingRight)};}
        return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,header:bounds('body>nav .nav-in'),body:bounds('.rd-hero'),footer:bounds('.site-footer-main'),brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),fonts:[getComputedStyle(document.querySelector('h1')).fontFamily,getComputedStyle(document.body).fontFamily]};
      });
      assert.equal(geometry.width,geometry.scrollWidth);
      assert.deepEqual(geometry.brokenImages,[]);
      for(const edge of ['left','right'])for(const section of ['body','footer'])assert.ok(Math.abs(geometry.header[edge]-geometry[section][edge])<=1,JSON.stringify(geometry));
      if(width<768){await visual.page.locator('.nav-toggle').click();assert.ok(await visual.page.locator('#mobile-menu a[href="/partnership/"]').isVisible());await visual.page.locator('.nav-toggle').click();}
      if([1440,390,320].includes(width)){
        await visual.page.screenshot({path:path.join(output,'hero-'+width+'.png')});
        await visual.page.screenshot({path:path.join(output,'page-'+width+'.png'),fullPage:true});
        await visual.page.locator('body>nav').evaluate(n=>n.style.visibility='hidden');
        for(const selector of ['#approach','#study','#research','#partner-inquiry'])await visual.page.locator(selector).screenshot({path:path.join(output,selector.slice(1)+'-'+width+'.png')});
        await visual.page.locator('body>nav').evaluate(n=>n.style.visibility='');
      }
      result.widths.push(geometry);
    }
    assert.equal(visual.posts.length,0);
    await visual.page.setViewportSize({width:1440,height:1000});
    await visual.page.waitForFunction(()=>window.__widgets[Number(document.querySelector('#partnershipForm .gamgee-recaptcha').dataset.widgetId)].size==='normal');
    await visual.page.locator('.rd-hero a').click();assert.equal(new URL(visual.page.url()).hash,'#partner-inquiry');
    assert.ok((await visual.page.locator('.vp-email-button').getAttribute('href')).startsWith('mailto:partners@gamgee.io'));
    await submit(visual.page);assert.equal(await visual.page.evaluate(()=>document.activeElement.id),'partnerFirstName');
    await fill(visual.page,{...sample,firstName:'   '});await submit(visual.page);assert.equal(await visual.page.evaluate(()=>document.activeElement.id),'partnerFirstName');
    await fill(visual.page,{...sample,email:'not-an-email'});await submit(visual.page);assert.equal(await visual.page.evaluate(()=>document.activeElement.id),'partnerEmail');
    await fill(visual.page);await visual.page.evaluate(()=>window.__captchaToken='');await submit(visual.page);await failureReady(visual.page);assert.equal(visual.posts.length,0);
    await visual.page.evaluate(()=>window.__captchaToken='mock-token');
    await visual.page.evaluate(()=>{const f=document.getElementById('partnershipForm');f.requestSubmit();f.requestSubmit();});
    await visual.page.locator('#partnershipSuccess').waitFor({state:'visible'});
    assert.equal(visual.posts.length,1);
    const body=visual.posts[0].body;
    assert.deepEqual(Object.keys(body).sort(),['_sheet',...Object.keys(sample),'recaptchaToken'].sort());
    assert.equal(body._sheet,'Partners');assert.equal(body.firstName,'Preview');assert.equal(body.message,'Mock inquiry only.');
    assert.equal(visual.posts[0].headers['content-type'],'text/plain');
    await visual.page.locator('.js-open-referral').click();
    await visual.page.waitForFunction(()=>window.__widgets.some(w=>w.form==='referralForm'));
    const widgets=await visual.page.evaluate(()=>window.__widgets);
    assert.deepEqual(widgets.map(w=>w.size),['normal','compact','compact']);
    assert.equal(new Set(widgets.map(w=>w.id)).size,3);
    assert.equal(await visual.page.locator('#partnershipForm .vp-captcha-label').count(),0);
    await visual.page.evaluate(()=>{
      const form=document.getElementById('referralForm');for(const field of form.querySelectorAll('[required]')){
        if(field.type==='checkbox')field.checked=true;
        else if(field.tagName==='SELECT')field.value=[...field.options].find(o=>o.value&&!o.disabled).value;
        else field.value=field.type==='email'?'preview@example.org':field.type==='number'?'8':'Preview';
      }form.requestSubmit();
    });
    await visual.page.locator('#successCard').waitFor({state:'visible'});assert.equal(visual.posts[1].body._sheet,'Referral');
    await visual.page.keyboard.press('Escape');assert.equal(await visual.page.locator('#referralOverlay').isVisible(),false);
    await visual.context.close();
    result.checks.push('13 responsive widths, shared header/body/footer edges, embedded-font visual captures, no preview labels, working anchors and mailto.');
    result.checks.push('Responsive normal/compact CAPTCHA switches without clipping and reuses widget instances after resizing. Blank/whitespace/email/CAPTCHA validation, trimmed Partners payload, one POST for double dispatch, success on explicit status:ok, independent partnership/referral widgets and Referral routing. All POSTs intercepted.');
    for(const mode of ['error','empty','null','network']){
      const test=await setup(mode);await fill(test.page);await submit(test.page);await failureReady(test.page);
      assert.ok(await test.page.locator('#partnershipForm').isVisible());assert.equal(await test.page.locator('#partnershipSuccess').isVisible(),false);
      assert.equal(await test.page.inputValue('#partnerMessage'),'Mock inquiry only.');
      assert.equal(await test.page.locator('#partnerEmail').isDisabled(),false);assert.equal(await test.page.locator('#partnershipForm button[type="submit"]').isDisabled(),false);
      assert.ok((await test.page.evaluate(()=>window.__reset.length))>0);assert.equal(test.posts.length,1);
      await submitReferral(test.page);
      await test.page.waitForFunction(()=>document.querySelector('#referralForm .vet-form-feedback').textContent.includes('could not confirm receipt')&&document.getElementById('referralForm').getAttribute('aria-busy')==='false');
      assert.equal(await test.page.locator('#successCard').isVisible(),false);
      assert.equal(await test.page.inputValue('#vetFirst'),'Preview');
      assert.equal(await test.page.locator('#referralForm button[type="submit"]').isDisabled(),false);
      assert.equal(test.posts.length,2);
      assert.equal(test.posts[1].headers['content-type'],'text/plain');
      await test.context.close();
    }
    result.checks.push('For both forms, backend errors, empty/null responses, and network failures preserve input, restore controls, reset CAPTCHA, and never show success. Referral duplicate dispatch also produces one request.');
    const resized=await setup();
    await fill(resized.page);
    await resized.page.waitForFunction(()=>document.querySelector('#partnershipForm .gamgee-recaptcha').dataset.widgetId!==undefined);
    await resized.page.evaluate(()=>{const id=document.querySelector('#partnershipForm .gamgee-recaptcha').dataset.widgetId;window.__captchaTokens={[id]:'solved-normal'};});
    for(const [width,size,token] of [[320,'compact','solved-compact'],[1440,'normal','solved-normal-again']]){
      await resized.page.setViewportSize({width,height:1000});
      await resized.page.waitForFunction(size=>window.__widgets[Number(document.querySelector('#partnershipForm .gamgee-recaptcha').dataset.widgetId)].size===size,size);
      await submit(resized.page);await failureReady(resized.page);
      assert.equal(resized.posts.length,0,'A solved token from the previous widget must not be reused');
      assert.match(await resized.page.locator('[data-form-feedback]').innerText(),/complete the security check/);
      await resized.page.evaluate(token=>{const id=document.querySelector('#partnershipForm .gamgee-recaptcha').dataset.widgetId;window.__captchaTokens[id]=token;},token);
    }
    await submit(resized.page);await resized.page.locator('#partnershipSuccess').waitFor({state:'visible'});
    assert.equal(resized.posts.length,1);assert.equal(resized.posts[0].body.recaptchaToken,'solved-normal-again');
    assert.equal(await resized.page.evaluate(()=>window.__widgets.length),2);
    await resized.context.close();
    result.checks.push('Solved tokens are cleared when switching CAPTCHA sizes; both directions require a fresh solve, reuse two instances, and submit only the active widget token.');
    const unavailable=await setup('captcha_api_failure');
    await fill(unavailable.page);await submit(unavailable.page);await failureReady(unavailable.page);
    assert.match(await unavailable.page.locator('#partnershipForm [data-form-feedback]').innerText(),/Please refresh this page/);
    assert.equal(await unavailable.page.locator('#partnershipSuccess').isVisible(),false);
    assert.equal(await unavailable.page.inputValue('#partnerMessage'),'Mock inquiry only.');
    assert.equal(await unavailable.page.locator('#partnershipForm button[type="submit"]').isDisabled(),false);
    assert.equal(unavailable.posts.length,0);
    await unavailable.context.close();
    result.checks.push('Failed CAPTCHA API load directs the user to refresh, retains answers, restores the button and sends zero requests.');
    assert.deepEqual(result.errors,[]);
    fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result,null,2));
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exit(1);});
