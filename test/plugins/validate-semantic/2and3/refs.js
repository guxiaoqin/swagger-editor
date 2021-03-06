import expect from "expect"
import validateHelper, { expectNoErrorsOrWarnings } from "../validate-helper.js"

describe("validation plugin - semantic - 2and3 refs", function() {
  this.timeout(10 * 1000)
  describe("Ref siblings", () => {

    it("should return a warning when another property is a sibling of a $ref in OpenAPI 3", () => {
      const spec = {
        openapi: "3.0.0",
        paths: {
          "/CoolPath": {
            get: {
              $ref: "#/components/schemas/abc",
              description: "My very cool get"
            }
          }
        },
        components: {
          schemas: {
            abc: {}
          }
        }
      }

      return validateHelper(spec)
      .then(system => {
        const allErrors = system.errSelectors.allErrors().toJS()
        expect(allErrors.length).toEqual(1)
        const firstError = allErrors[0]
        expect(firstError.message).toMatch("Sibling values are not allowed alongside $refs")
        expect(firstError.level).toEqual("warning")
        expect(firstError.path).toEqual(["paths", "/CoolPath", "get", "description"])
      })
    })
    it("should return a warning when another property is a sibling of a $ref in Swagger 2", () => {
      const spec = {
        swagger: "2.0",
        paths: {
          "/CoolPath": {
            get: {
              $ref: "#/definitions/abc",
              description: "My very cool get"
            }
          }
        },
        definitions: {
          abc: {}
        }
      }

      return validateHelper(spec)
      .then(system => {
        const allErrors = system.errSelectors.allErrors().toJS()
        expect(allErrors.length).toEqual(1)
        const firstError = allErrors[0]
        expect(firstError.message).toMatch("Sibling values are not allowed alongside $refs")
        expect(firstError.level).toEqual("warning")
        expect(firstError.path).toEqual(["paths", "/CoolPath", "get", "description"])
      })
    })

    it("should return no warnings when a $ref has no siblings in OpenAPI 3", () => {
      const spec = {
        openapi: "3.0.0",
        paths: {
          "/CoolPath": {
            get: {
              $ref: "#/components/schemas/abc"
            }
          }
        },
        components: {
          schemas: {
            abc: {}
          }
        }
      }

      return expectNoErrorsOrWarnings(spec)
    })
    it("should return no warnings when a $ref has no siblings in Swagger 2", () => {
      const spec = {
        swagger: "2.0",
        paths: {
          "/CoolPath": {
            get: {
              $ref: "#/definitions/abc"
            }
          }
        },
        definitions: {
          abc: {}
        }
      }

      return expectNoErrorsOrWarnings(spec)
    })

  })
  describe("Unused definitions", () => {
    it("should return a warning when a definition is declared but not used in OpenAPI 3", () => {
      const spec = {
        openapi: "3.0.0",
        paths: {
          "/CoolPath": {
            get: {
              responses: {
                200: {
                  schema: {
                    $ref: "#/components/schemas/x~1Foo"
                  }
                }
              }
            }
          }
        },
        components: {
          schemas: {
            "x/Foo": {
              type: "object"
            },
            "x~Bar": {
              type: "object"
            }
          }
        }
      }

      return validateHelper(spec)
      .then(system => {
        const allErrors = system.errSelectors.allErrors().toJS()
        expect(allErrors.length).toEqual(1)
        const firstError = allErrors[0]
        expect(firstError.message).toMatch("Definition was declared but never used in document")
        expect(firstError.level).toEqual("warning")
        expect(firstError.path).toEqual(["components", "schemas", "x~Bar"])
      })
    })

    it("should not return a warning when a definition with special character is declared and used in OpenAPI 3", () => {
      const spec = {
        openapi: "3.0.0",
        paths: {
          "/CoolPath": {
            get: {
              responses: {
                200: {
                  schema: {
                    $ref: "#/components/schemas/x~1Foo"
                  }
                },
                400: {
                  schema: {
                    $ref: "#/components/schemas/x~0Bar"
                  }
                }
              }
            }
          }
        },
        components: {
          schemas: {
            "x/Foo": {
              type: "object"
            },
            "x~Bar": {
              type: "object"
            }
          }
        }
      }

      return validateHelper(spec)
      .then(system => {
        const allErrors = system.errSelectors.allErrors().toJS()
        expect(allErrors.length).toEqual(0)
      })
    })

    it("should return a warning when a definition is declared but not used in Swagger 2", () => {
      const spec = {
        paths: {
          "/CoolPath": {}
        },
        definitions: {
          abc: {
            type: "string"
          }
        }
      }

      return validateHelper(spec)
      .then(system => {
        const allErrors = system.errSelectors.allErrors().toJS()
        expect(allErrors.length).toEqual(1)
        const firstError = allErrors[0]
        expect(firstError.message).toMatch("Definition was declared but never used in document")
        expect(firstError.level).toEqual("warning")
        expect(firstError.path).toEqual(["definitions", "abc"])
      })
    })

    it("should not return a warning when a definition with special character is declared and used in Swagger 2", () => {
      const spec = {
        paths: {
          "/CoolPath": {
            get: {
              responses: {
                200: {
                  schema: {
                    $ref: "#/definitions/x~1Foo"
                  }
                },
                400: {
                  schema: {
                    $ref: "#/definitions/x~0Bar"
                  }
                }
              }
            }
          }
        },
        definitions: {
          "x/Foo": {
            type: "object"
          },
          "x~Bar": {
            type: "object"
          }
        }
      }

      return validateHelper(spec)
      .then(system => {
        const allErrors = system.errSelectors.allErrors().toJS()
        expect(allErrors.length).toEqual(0)
      })
    })

  })
  describe("Malformed $ref values", () => {
    it("should return an error when a JSON pointer lacks a leading `#/`", () => {
      const spec = {
        paths: {
          "/CoolPath": {
            $ref: "#myObj/abc"
          }
        },
        myObj: {
          abc: {
            type: "string"
          }
        }
      }

      return validateHelper(spec)
      .then(system => {
        const allErrors = system.errSelectors.allErrors().toJS()
        expect(allErrors.length).toEqual(1)
        const firstError = allErrors[0]
        expect(firstError.message).toMatch("$ref paths must begin with `#/`")
        expect(firstError.level).toEqual("error")
        expect(firstError.path).toEqual(["paths", "/CoolPath", "$ref"])
      })
    })

    it("should return no errors when a JSON pointer is a well-formed remote reference", () => {
      const spec = {
        paths: {
          "/CoolPath": {
            $ref: "http://google.com#/myObj/abc"
          }
        },
        myObj: {
          abc: {
            type: "string"
          }
        }
      }

      return validateHelper(spec)
      .then(system => {
        const allSemanticErrors = system.errSelectors.allErrors().toJS()
          .filter(err => err.source !== "resolver")
        expect(allSemanticErrors).toEqual([])
      })
    })

  })
})
