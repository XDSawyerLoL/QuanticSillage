import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base:'./',
  build:{rollupOptions:{input:{
    home:resolve(process.cwd(),'index.html'),
    lab:resolve(process.cwd(),'lab.html'),
    projects:resolve(process.cwd(),'projects.html'),
    solutions:resolve(process.cwd(),'solutions.html'),
    research:resolve(process.cwd(),'research.html'),
    team:resolve(process.cwd(),'team.html'),
    press:resolve(process.cwd(),'press.html'),
    news:resolve(process.cwd(),'news.html'),
    pulse:resolve(process.cwd(),'pulse.html'),
    zoon:resolve(process.cwd(),'zoon.html'),
    careers:resolve(process.cwd(),'careers.html'),
    contact:resolve(process.cwd(),'contact.html')
  }}}
})
