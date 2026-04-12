- node /home/blog/scripts/build.js
- Found 11 posts
- node:fs:2437
- ^
- at Object.writeFileSync (node:fs:2437:20)
- at generatePaginationPages (/home/blog/scripts/build.js:394:9)
- at Object.<anonymous> (/home/blog/scripts/build.js:715:1)
- at Module._extensions..js (node:internal/modules/cjs/loader:1839:10)
- at Module._load (node:internal/modules/cjs/loader:1263:12)
- errno: -2,
- syscall: 'open',
- }
- ???(root?localhost)-[/home/blog]
- ─(root㉿localhost)-[/home/blog]
└─# node /home/blog/scripts/build.js                                                                               
Building static blog...

Found 11 posts

Generated: index.html
node:fs:2437
    return binding.writeFileUtf8(
                   ^

Error: ENOENT: no such file or directory, open '/home/blog/output/page/2.html'
    at Object.writeFileSync (node:fs:2437:20)
    at generateHomepage (/home/blog/scripts/build.js:320:8)
    at generatePaginationPages (/home/blog/scripts/build.js:394:9)
    at build (/home/blog/scripts/build.js:629:5)
    at Object.<anonymous> (/home/blog/scripts/build.js:715:1)
    at Module._compile (node:internal/modules/cjs/loader:1706:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1839:10)
    at Module.load (node:internal/modules/cjs/loader:1441:32)
    at Module._load (node:internal/modules/cjs/loader:1263:12)
    at TracingChannel.traceSync (node:diagnostics_channel:328:14) {
  errno: -2,
  code: 'ENOENT',
  syscall: 'open',
  path: '/home/blog/output/page/2.html'
}
