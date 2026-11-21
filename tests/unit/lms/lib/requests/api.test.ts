// ---------------------------------------------------------------------------
// lib/requests/api.test.ts
// The multipart routing of a request submit is a CONTRACT with the server:
// the server matches each file part by its PART NAME against an Attachment
// field's `inputKey`, and REJECTS a part that routes nowhere. A mis-named part
// therefore does not land on the wrong field — it fails the whole submit.
//
// These tests pin that mapping on the FormData the client actually builds.
// ---------------------------------------------------------------------------

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { configureLmsTransport } from "@/features/lms/lib/transport"
import { submitRequest } from "@/features/lms/lib/requests/api"

const apiFetchMock = vi.fn()

/** The part names of a FormData, in insertion order. */
function partNames(form: FormData): string[] {
  return Array.from(form.keys())
}

/** The file names sent under a given part name. */
function filesUnder(form: FormData, name: string): string[] {
  return form.getAll(name).map((entry) => (entry as File).name)
}

const payload = {
  templateId: "t1",
  subject: "Hello",
  answers: [],
}

describe("submitRequest multipart routing", () => {
  let cleanup: () => void

  beforeEach(() => {
    apiFetchMock.mockReset()
    apiFetchMock.mockResolvedValue({ id: "r1" })
    cleanup = configureLmsTransport({ request: apiFetchMock, resolveUrl: (path) => path })
  })

  afterEach(() => cleanup())

  it("sends the payload as the `payload` part", async () => {
    await submitRequest(payload)

    const form = apiFetchMock.mock.calls[0][1].body as FormData
    expect(JSON.parse(form.get("payload") as string)).toEqual(payload)
  })

  it("names each part after the field's inputKey, not the generic bucket", async () => {
    await submitRequest(payload, {
      attachment_a: [new File(["a"], "a.pdf", { type: "application/pdf" })],
      attachment_b: [new File(["b"], "b.pdf", { type: "application/pdf" })],
    })

    const form = apiFetchMock.mock.calls[0][1].body as FormData
    expect(partNames(form)).toContain("attachment_a")
    expect(partNames(form)).toContain("attachment_b")
    // Neither part may fall back to the generic bucket, or the server routes
    // both to the FIRST Attachment field.
    expect(form.getAll("files")).toHaveLength(0)
  })

  it("keeps two fields' files apart", async () => {
    await submitRequest(payload, {
      attachment_a: [new File(["a"], "a.pdf", { type: "application/pdf" })],
      attachment_b: [new File(["b"], "b.pdf", { type: "application/pdf" })],
    })

    const form = apiFetchMock.mock.calls[0][1].body as FormData
    expect(filesUnder(form, "attachment_a")).toEqual(["a.pdf"])
    expect(filesUnder(form, "attachment_b")).toEqual(["b.pdf"])
  })

  it("sends every file of one field under that field's part name", async () => {
    await submitRequest(payload, {
      attachment_a: [
        new File(["a"], "a.pdf", { type: "application/pdf" }),
        new File(["b"], "b.png", { type: "image/png" }),
      ],
    })

    const form = apiFetchMock.mock.calls[0][1].body as FormData
    expect(filesUnder(form, "attachment_a")).toEqual(["a.pdf", "b.png"])
  })

  it("maps a flat File[] onto the generic `files` bucket", async () => {
    await submitRequest(payload, [
      new File(["a"], "a.pdf", { type: "application/pdf" }),
    ])

    const form = apiFetchMock.mock.calls[0][1].body as FormData
    expect(filesUnder(form, "files")).toEqual(["a.pdf"])
  })

  it("sends no file parts when there is nothing to attach", async () => {
    await submitRequest(payload)

    const form = apiFetchMock.mock.calls[0][1].body as FormData
    expect(partNames(form)).toEqual(["payload"])
  })
})
