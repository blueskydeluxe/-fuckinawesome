export function submissionStatus(status,screening) {
 if(status==='approved')return {label:'Live',tone:'good',message:'Your discovery is published and ready for votes.'};
 if(status==='rejected')return {label:'Needs a change',tone:'attention',message:'Your discovery was not approved. Check the cover, description and source against the community guidelines, then update the cover to send it back for review.'};
 if(status==='hidden')return {label:'Hidden',tone:'attention',message:'This discovery is not public. Contact support if you need help with the review.'};
 if(screening==='blocked')return {label:'Replace the cover',tone:'attention',message:'Automated safety screening blocked this image. Upload a suitable cover to continue.'};
 if(screening==='review')return {label:'Cover needs attention',tone:'attention',message:'Automated screening flagged this cover. Replace it with a suitable image, or contact support to appeal.'};
 if(screening==='passed')return {label:'Awaiting review',tone:'pending',message:'Your cover passed automated screening. A moderator still needs to review the discovery before it goes live.'};
 return {label:'Screening pending',tone:'pending',message:'Your discovery is saved privately. Image screening must finish before a moderator can approve it.'};
}
