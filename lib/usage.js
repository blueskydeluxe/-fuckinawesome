import {db} from './supabase';
import {measurementAllowed} from './usage-consent.mjs';
export {measurementAllowed} from './usage-consent.mjs';
let enabled=false;
const visited=new Set();
const events=new Set(['visit','vote','submission','open','share','image','image_error']);
export function configureMeasurement(consent,member){enabled=!!member&&measurementAllowed(consent,{doNotTrack:navigator.doNotTrack,globalPrivacyControl:navigator.globalPrivacyControl});if(enabled&&!visited.has(member)){visited.add(member);trackUsage('visit')}}
export function trackUsage(event,elapsed=0){if(!enabled||!db||!events.has(event))return;db.rpc('record_discovery_usage',{event_name:event,elapsed_ms:Math.min(60000,Math.max(0,Math.round(Number(elapsed)||0)))}).catch(()=>{})}
