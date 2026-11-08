import {test,expect} from '@playwright/test';
// Run against your own local preview: BASE_URL=http://localhost:5173 npx playwright test.
test.use({baseURL:process.env.BASE_URL||'http://localhost:5173'});
test('command center persists a report',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:'Operational overview'})).toBeVisible();
 await page.getByRole('button',{name:'New incident',exact:true}).click();
 await page.getByLabel('Location / landmark').fill('E2E test medical post');
 await page.getByLabel('Brief description').fill('Synthetic test report');
 await page.getByRole('button',{name:'Submit report',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Report received by prototype'})).toBeVisible();
 await page.getByRole('button',{name:'Close dialog'}).click();
 await page.getByRole('button',{name:/^Incidents/}).click();
 await expect(page.getByText('E2E test medical post',{exact:true})).toBeVisible();
});
test('mobile public mode excludes control-room records',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.getByRole('button',{name:'Switch demo role'}).click();
 await page.getByRole('button',{name:'Devotee',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Safety & assistance',exact:true})).toBeVisible();
 await expect(page.getByText('Emergency SOS',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'CCTV intelligence',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
