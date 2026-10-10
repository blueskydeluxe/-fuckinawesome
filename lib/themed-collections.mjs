import {canonicalTag} from './tag-aliases.mjs';
export const collections=[
 {slug:'genius-or-gimmick',title:'Genius or Gimmick?',description:'Five inventions. Would you actually use them?',categories:['Technology'],tags:['gadgets','gaming','smart home'],ids:['a28fd122-1ab1-494d-aec4-fcac3add944d','010b532f-879a-4ba3-9067-375e97f2ef9c','efb3d0bc-1a7a-4f2f-90c3-dc2c1bbcd6e8','654b4724-1778-4ca8-a433-e36dc5800c18','9f188cba-d849-498c-aadf-fe84adf3152e']},
 {slug:'watches-worth-the-hype',title:'Watches Worth the Hype?',description:'Mechanical art or too much? Make your call.',categories:['Machines'],tags:['watches','craftsmanship'],ids:['3a733150-3915-439b-85af-23a0bc3151ae','ff6ac86a-bf76-4c6f-b1a2-5458e48f13c6','66857088-61cc-4b75-9b8a-97d6a7234089','f7a71d4f-a1bb-46aa-aa69-5b4c57e5508a','ef122c5b-e250-4fda-9af3-b2a47be4977b']},
 {slug:'places-worth-the-flight',title:'Places Worth the Flight?',description:'Five extraordinary places. Which deserve your vote?',categories:['Adventure'],tags:['travel','scenic views','nature','landscapes'],ids:['00a9a727-2f74-42ab-b26e-2222480016c4','7554e497-8aca-42af-a13c-97849333bcef','0a0e91c3-40c4-42df-a6dc-a86166ea2683','b265f679-0f2b-4421-8b8e-db7b6fa09c07','08b5cbda-64ef-4b6e-962e-ff0a51f8edba']},
 {slug:'stay-somewhere-unreal',title:'Stay Somewhere Unreal',description:'Cabins, treehouses and rooms with a different view.',categories:['Architecture','Adventure'],tags:['airbnb','unique stays','architecture','design'],ids:['a7a66105-89c5-4186-9341-736c0f956a1b','76cec5c5-8485-46b8-8d46-4e8d1a4aa79e','f725f92f-fcc5-4b4b-a3de-fb3edc9c95fc','e19d6f85-d7c2-445b-9816-e853edf4cb08','2aab289c-4cab-44a9-9e6d-e585105da2c1']},
 {slug:'dinner-worth-a-detour',title:'Dinner Worth a Detour?',description:'Five food discoveries. Pick what deserves the Hall.',categories:['Food'],tags:['restaurants','dining','food'],ids:['010aec07-63e1-4015-833d-995f3a25e0ca','cae8b37d-7eae-4255-abcf-9d2821de9a6d','f93ca82b-232c-4f39-b2a2-3e93e3fdd493','4bda204d-b182-4046-8c51-e51175e1d05a','e3a83f01-7596-490c-b1e9-4c9b4c1cab05']}
];
export function collectionBySlug(slug){return collections.find(x=>x.slug===slug)||null}
export function featuredCollection(category='All',tag=null,date=new Date()){
 const choices=collections.filter(x=>tag?x.tags.includes(canonicalTag(tag)):category==='All'||x.categories.includes(category));
 if(!choices.length)return null;
 const week=Math.floor(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())/(7*86400000));
 return choices[week%choices.length];
}
export function eligibleCollectionRows(definition,rows,votes={}){const byId=new Map(rows.filter(x=>!votes[x.id]&&x.status==='approved'&&x.image_path&&x.description?.trim().length>=20).map(x=>[x.id,x]));return definition.ids.map(id=>byId.get(id)).filter(Boolean)}
export function selectOpeningRows(rows,limit=10){
 const priorities=new Set(collections.flatMap(x=>x.ids));const valid=rows.filter(x=>x.status==='approved'&&x.image_path&&x.description?.trim().length>=20);
 const sorted=[...valid].sort((a,b)=>Number(priorities.has(b.id))-Number(priorities.has(a.id)));
 const result=[],ids=new Set(),sources=new Set(),categories=new Set();
 const source=x=>{try{return new URL(x.url).hostname.replace(/^www\./,'')}catch{return x.id}};
 const add=x=>{if(ids.has(x.id))return;ids.add(x.id);sources.add(source(x));categories.add(x.category);result.push(x)};
 for(const x of sorted)if(result.length<limit&&!categories.has(x.category))add(x);
 for(const x of sorted)if(result.length<limit&&!sources.has(source(x)))add(x);
 for(const x of sorted)if(result.length<limit)add(x);
 return result;
}
