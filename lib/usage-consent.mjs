export function measurementAllowed(consent,signals={}) {
 return consent===true&&signals.doNotTrack!=='1'&&signals.globalPrivacyControl!==true;
}
