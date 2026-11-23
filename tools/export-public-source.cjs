"use strict";
const fs=require("node:fs"),path=require("node:path"),{execFileSync}=require("node:child_process");
const TEXT_EXTENSIONS=new Set([".js",".cjs",".mjs",".html",".css",".md",".json",".txt",".yml",".yaml",".swift",".sh"]);
const PRIVATE_ROOTS=new Set(["assets","exports","artifacts","node_modules","coverage","test-results","playwright-report"]);
const SECRET=/(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/;
const EMBEDDED_MEDIA=/data:(?:image|audio|font)\/[^;]+;base64,[A-Za-z0-9+/]{100,}/;
function allowed(file){
  const root=file.split("/")[0];
  return !PRIVATE_ROOTS.has(root)&&!file.split("/").some(p=>p.startsWith(".")&&p!==".gitignore")&&
    !/(?:^|\/)(?:\.env[^/]*|credentials|secrets?)(?:\.|\/|$)/i.test(file)&&
    (file===".gitignore"||TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()));
}
function collect(root=path.resolve(__dirname,"..")){
  const git=args=>execFileSync("git",args,{cwd:root,encoding:"utf8",maxBuffer:16*1024*1024});
  const sourceCommit=git(["rev-parse","HEAD"]).trim(),files=[];
  for(const file of git(["ls-files","-z"]).split("\0").filter(Boolean).filter(allowed)){
    const buffer=fs.readFileSync(path.join(root,file));
    const content=new TextDecoder("utf-8",{fatal:true}).decode(buffer);
    if(buffer.includes(0)||SECRET.test(content)||EMBEDDED_MEDIA.test(content))throw Error(`Unsafe public content: ${file}`);
    let publicContent=content;
    if(file===".gitignore")publicContent+="\n# Public source copy: keep licensed assets out of GitHub.\n/assets/\n.env*\n";
    if(file==="README.md")publicContent=`> **Public source-only snapshot.** Artwork, audio, fonts, release packages and private development history are intentionally excluded. This copy is not a standalone playable game. See [GITHUB_SOURCE.md](GITHUB_SOURCE.md).\n\n${content}`;
    files.push({path:file,mode:"100644",type:"blob",content:publicContent});
  }
  return {sourceCommit,files};
}
if(require.main===module){
  const output=process.argv[2];if(!output)throw Error("Provide a destination JSON path outside the public repository.");
  const bundle=collect(),json=JSON.stringify(bundle);fs.writeFileSync(output,json);
  console.log(JSON.stringify({file:path.resolve(output),sourceCommit:bundle.sourceCommit,files:bundle.files.length,bytes:Buffer.byteLength(json),characters:json.length}));
}
module.exports={allowed,collect};
