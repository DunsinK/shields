import { isFormattedDate } from '../test-validators.js'
import { createServiceTester } from '../tester.js'

export const t = await createServiceTester()

// helper function for readiblity
function packageVersionTree(version, packageName) {
  return {
    type: 'tree',
    name: version,
    objects: {
      entries: [{ type: 'blob', name: `${packageName}.yaml` }],
    },
  }
}

function manifestText(packageName, nReleaseDate) {
  return `PackageIdentifier: ${packageName}\nReleaseDate: ${nReleaseDate}\n`
}

// basic test
t.create('release date for WSL')
  .get('/release-date/Microsoft.WSL.json')
  .expectBadge({ label: 'release date', message: isFormattedDate })

// test sort based on dotted version order instead of ASCII
t.create('gets release date for latest version (not ASCII order)')
  .intercept(nock =>
    nock('https://api.github.com/')
      .post('/graphql')
      .twice()
      .reply((uri, requestBody) => {
        const { query, variables } = JSON.parse(requestBody)
        if (query.includes('Tree')) {
          return [
            200,
            {
              data: {
                repository: {
                  object: {
                    entries: [
                      packageVersionTree('0.200.170', 'Microsoft.DevHome'),
                      packageVersionTree('0.1201.422.0', 'Microsoft.DevHome'),
                    ],
                  },
                },
              },
            },
          ]
        }

        if (variables.expression.includes('0.1201.442.0')) {
          return [
            200,
            {
              data: {
                repository: {
                  object: {
                    text: manifestText('Microsoft.DevHome', '2024-03-15'),
                  },
                },
              },
            },
          ]
        }

        return [200, { data: { repository: { object: null } } }]
      }),
  )
  .get('/release-date/Microsoft.DevHome.json')
  .expectBadge({ label: 'release date', message: isFormattedDate })

//
t.create('do not pick sub-package release date')
  .intercept(nock =>
    nock('https://api.github.com/')
      .post('/graphql')
      .twice()
      .reply((uri, requestBody) => {
        const { query, variables } = JSON.parse(requestBody)

        if (query.includes('Tree')) {
          return [
            200,
            {
              data: {
                repository: {
                  object: {
                    entries: [
                      {
                        type: 'tree',
                        name: '2404',
                        object: {
                          entries: [{ type: 'tree', name: '2404.0.5.0' }],
                        },
                      },
                      packageVersionTree('2204.1.8.0', 'Canonical.Ubuntu'),
                    ],
                  },
                },
              },
            },
          ]
        }

        if (variables.expression.includes('2204.1.8.0')) {
          return [
            200,
            {
              data: {
                repository: {
                  object: {
                    text: 'PackageIdentifier: Canonical.Ubuntu\nReleaseDate: 2024-03-15\n',
                  },
                },
              },
            },
          ]
        }
        return [200, { data: { repository: { object: null } } }]
      }),
  )
  .get('/release-date/Canonical.Ubuntu.json')
  .expectBadge({ label: 'release date', message: isFormattedDate })
