import {chromium} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {localEnv} from '../../scripts/brainstorming/local-env.mjs';
export const base='http://127.0.0.1:3002';
export const password='Local-Brainstorm-Only-42!';
export const env=localEnv();
export const admin=createClient(env.API_URL,env.SERVICE_ROLE_KEY,{auth:{persistSession:false}});
export async function api(name){const c=createClient(env.API_URL,env.ANON_KEY,{auth:{persistSession:false}}); const {error}=await c.auth.signInWithPassword({email:`${name}@brainstorm.local`,password});if(error)throw error;return c;}
export async function launch(){return chromium.launch({headless:true});}
export async function login(browser,name='owner',options={}){const context=await browser.newContext(options);const page=await context.newPage();page.setDefaultTimeout(60000);await page.goto(base+'/login',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>{const input=document.querySelector('#email');return input&&Object.keys(input).some(k=>k.startsWith('__reactProps$'));});await page.getByLabel('Email address').fill(`${name}@brainstorm.local`);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(base+'/');await page.goto(base+'/brainstorming',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Brainstorming',exact:true}).waitFor();await page.getByLabel('Search notes').waitFor();return {context,page};}
export async function newNote(page,title){await page.getByRole('button',{name:'New Note',exact:true}).first().click();await page.getByLabel('Note title').waitFor();await page.getByLabel('Note title').waitFor({state:'visible'});await page.locator('[aria-label="Add block"]').waitFor();await page.getByLabel('Note title').fill(title);await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('status').filter({hasText:'Saved'}).waitFor();}
