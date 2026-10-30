const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium,launchOptions}=require('./browser-runtime.cjs');
const html=fs.readFileSync('site/career/index.html','utf8');
assert.equal(html,fs.readFileSync('site/career/Career.html','utf8'),'Both careers entry points must match');
const captchaMock=`window.testToken='';window.grecaptcha={render:(node,options)=>{window.testCaptcha=options;node.innerHTML='<textarea name="g-recaptcha-response" hidden></textarea>';return 0},getResponse:()=>window.testToken,reset:()=>{window.testToken=''}};window.careersCaptchaReady();`;

(async()=>{
  const browser=await chromium.launch(launchOptions);
  try{
    async function open(mode){
      const context=await browser.newContext();
      const page=await context.newPage();
      const requests=[];
      // Every request is intercepted. Tests cannot submit to the live endpoint.
      await page.route('**/*',route=>{
        const url=new URL(route.request().url());
        if(url.origin==='https://www.gamgee.io'&&url.pathname==='/career/')return route.fulfill({contentType:'text/html',body:html});
        if(url.origin==='https://www.google.com'&&url.pathname==='/recaptcha/api.js')return route.fulfill({contentType:'application/javascript',body:captchaMock});
        if(url.origin==='https://script.google.com'){
          const input=JSON.parse(route.request().postData());requests.push(input);
          if(mode.value==='network')return route.abort();
          const result={protocolVersion:'careers-v1',submissionId:input.submissionId,outcome:mode.value,notification:'not_sent'};
          if(mode.value==='mismatch'){result.outcome='saved';result.submissionId='wrong-reference';}
          if(mode.value==='rejected')result.error={code:'captcha_required',message:'Please complete a fresh security check.'};
          return route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
        }
        return route.abort();
      });
      await page.goto('https://www.gamgee.io/career/#apply-senior-operations-manager');
      await page.waitForFunction(()=>window.testCaptcha);
      await page.evaluate(()=>{
        const form=document.querySelector('#form');
        form.elements.fullName.value='Sample Applicant';form.elements.email.value='applicant@example.com';
        for(const select of form.querySelectorAll('select')){select.selectedIndex=1;select.dispatchEvent(new Event('change'));}
        for(const text of form.querySelectorAll('textarea'))text.value='Relevant experience';
      });
      await page.locator('#resume').setInputFiles({name:'resume.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nResume')});
      return {page,requests,context};
    }
    async function solve(page){await page.evaluate(()=>{window.testToken=crypto.randomUUID();document.querySelector('[name=g-recaptcha-response]').value=window.testToken;window.testCaptcha.callback();});}
    for(const outcome of ['saved','already_received']){
      const {page,requests,context}=await open({value:outcome});
      await page.locator('[type=submit]').click();assert.equal(requests.length,0,'CAPTCHA is required in the browser');
      await solve(page);await page.locator('[type=submit]').click();await page.locator('#success').waitFor({state:'visible'});
      assert.equal(requests[0].roleId,'senior-operations-manager');assert.equal(requests[0]._sheet,'Careers');
      assert.equal(Buffer.from(requests[0].resume.data,'base64').toString(),'%PDF-1.4\nResume');
      assert.equal(await page.locator('#confirmation-title').textContent(),'Thanks for taking the time to apply!');
      await context.close();console.log('PASS matching '+outcome+' receipt shows generic confirmation');
    }
    for(const outcome of ['rejected','recovery_required','mismatch','unknown']){
      const {page,context}=await open({value:outcome});await solve(page);await page.locator('[type=submit]').click();
      await page.waitForFunction(()=>document.querySelector('#careers-submission-message').textContent.length>0);
      assert.equal(await page.locator('#success').isVisible(),false);assert.equal(await page.locator('[name=fullName]').inputValue(),'Sample Applicant');
      await context.close();console.log('PASS '+outcome+' preserves answers and never shows success');
    }
    {
      const mode={value:'network'},{page,requests,context}=await open(mode);await solve(page);await page.locator('[type=submit]').click();
      await page.waitForFunction(()=>document.querySelector('#careers-submission-message').textContent.includes('could not confirm'));
      mode.value='saved';await solve(page);await page.locator('[type=submit]').click();await page.locator('#success').waitFor({state:'visible'});
      assert.equal(requests[0].submissionId,requests[1].submissionId);assert.notEqual(requests[0].recaptchaToken,requests[1].recaptchaToken);
      await context.close();console.log('PASS lost-response retry keeps reference and obtains fresh CAPTCHA token');
    }
    {
      const {page,context}=await open({value:'saved'});
      for(const name of ['startup','healthcare']){
        const details=name==='startup'?'startupExperience':'healthcareExperience';
        await page.locator('[name='+name+']').selectOption({label:'No'});
        assert.equal(await page.locator('[name='+details+']').isVisible(),true);
        assert.equal(await page.locator('[name='+details+']').evaluate(el=>el.required),false);
        await page.locator('[name='+name+']').selectOption({index:1});
        assert.equal(await page.locator('[name='+details+']').evaluate(el=>el.required),true);
      }
      await context.close();console.log('PASS follow-ups stay visible and conditional validation remains intact');
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
