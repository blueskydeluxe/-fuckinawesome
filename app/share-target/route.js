export async function GET(request){return Response.redirect(new URL('/?share_error=install',request.url),303)}
// Receiving photos happens locally in the installed app's service worker.
export async function POST(request){return Response.redirect(new URL('/?share_error=install',request.url),303)}
