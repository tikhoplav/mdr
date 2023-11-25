import Fastify from 'fastify'
import * as fastifyStatic from '@fastify/static'
import fs from 'node:fs'
import showdown from 'showdown'

const fastify = Fastify({ logger: true })

fastify.register(fastifyStatic, {
  root: '/app/public',
  prefix: '/public',
})

const template = fs.readFileSync('/app/public/template.html', 'utf8')

fastify.get('/', function (request, reply) {
  fs.readdir('/app/data', (err, files) => {
    if (err) {
      fastify.log.error(err)
      return reply.status(500).send('internal error')
    }

    const links = files.map(file => {
      const { mtime } = fs.statSync(`/app/data/${file}`)
      const ts = Date.parse(mtime)

      return {
        ref: file.replace(/\.md$/, ''),
        ts,
      }
    })
    .sort((a, b) => b.ts - a.ts)
    .map(data => `<tr><td><a href="/${
      data.ref
    }">${data.ref}</a></td><td align='right'>${
      (new Date(data.ts)).toLocaleDateString('en-En', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }</td></tr>`)

    const table = `<table>${links.join('')}</table>`
    const html = template
      .replace('{{ title }}', 'index')
      .replace('{{ message }}', table)

    reply.status(200).header('Content-type', 'text/html').send(html)
  })
})


fastify.get('/:name', function (request, reply) {
  const { name } = request.params

  fs.readFile(`/app/data/${name}.md`, 'utf8', (err, data) => {
    if (err) {
      fastify.log.error(err)
      return reply.status(404).send('not found')
    }

    const title = data.split('\n')[0].replace(/^#\s+/, '')

    const converter = new showdown.Converter()
    const message = converter.makeHtml(data).replace('\n', '')

    const html = template
      .replace('{{ title }}', title)
      .replace('{{ message }}', message)

    reply.status(200).header('Content-type', 'text/html').send(html)
  })
})

try {
  await fastify.listen({ host: '0.0.0.0', port: 3000 })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
