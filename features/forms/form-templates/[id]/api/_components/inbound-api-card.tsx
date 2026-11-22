'use client'
// ---------------------------------------------------------------------------
// _components/inbound-api-card.tsx
// The template's inbound machine-to-machine link: endpoint, secret key,
// headers, and the sample request body, all read from the backend.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { Check, Copy, KeyRound, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { TemplateApiLinkDto } from '../types/api-link'
import { DarkJsonPre } from './dark-json-pre'

interface InboundApiCardProps {
  link: TemplateApiLinkDto | null
  loading: boolean
}

export function InboundApiCard({ link, loading }: InboundApiCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">API tiếp nhận biểu mẫu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!link) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">API tiếp nhận biểu mẫu</CardTitle>
          <CardDescription>
            Mẫu biểu mẫu này chưa có liên kết API tiếp nhận.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            API tiếp nhận biểu mẫu
          </CardTitle>
          <CardDescription>
            Hệ thống bên thứ ba gửi POST tới endpoint này để tạo yêu cầu từ
            biểu mẫu này.
          </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <EndpointRow link={link} />

        <SecretKeyRow link={link} />

        {link.headers.length > 0 ? (
          <div>
            <p className="text-sm font-medium mb-2">Header</p>
            <div className="space-y-1">
              {link.headers.map((header) => (
                <div
                  key={header.key}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-xs"
                >
                  <code className="font-mono">{header.key}</code>
                  <code className="font-mono text-muted-foreground truncate">
                    {header.value}
                  </code>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <Tabs defaultValue="body">
          <TabsList className="grid w-full max-w-xs grid-cols-1">
            <TabsTrigger value="body">Body mẫu</TabsTrigger>
          </TabsList>
          <TabsContent value="body" className="mt-3">
            {link.body ? (
              <DarkJsonPre code={link.body} title="Body yêu cầu" />
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Chưa tạo body mẫu cho mẫu biểu mẫu này.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function EndpointRow({ link }: { link: TemplateApiLinkDto }) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">Endpoint</p>
      <div className="flex items-start gap-2 rounded-md border px-3 py-2">
        <Badge variant="default" className="shrink-0 mt-0.5">
          {link.method}
        </Badge>
        <code className="font-mono text-xs break-all">{link.apiUrl}</code>
        <CopyButton text={link.apiUrl} label="Sao chép endpoint" />
      </div>
      {link.description ? (
        <p className="mt-2 text-xs text-muted-foreground">{link.description}</p>
      ) : null}
    </div>
  )
}

function SecretKeyRow({ link }: { link: TemplateApiLinkDto }) {
  if (!link.hasApiKey) {
    return (
      <div>
        <p className="text-sm font-medium mb-2">Khoá bí mật</p>
        <p className="text-xs text-muted-foreground">
          Chưa tạo khoá bí mật cho mẫu biểu mẫu này.
        </p>
      </div>
    )
  }

  // The mask is applied on the server, so there is no client-side value to
  // reveal. The key itself is only readable by a template admin.
  const masked = link.apiKey.includes('•')

  return (
    <div>
      <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
        Khoá bí mật
      </p>
      <div className="flex items-start gap-2 rounded-md border px-3 py-2">
        <code className="font-mono text-xs break-all flex-1">{link.apiKey}</code>
        {!masked ? (
          <CopyButton text={link.apiKey} label="Sao chép khoá bí mật" />
        ) : null}
      </div>
      {masked ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Khoá bí mật đã được ẩn. Chỉ người có quyền quản trị biểu mẫu
            mới đọc được giá trị của nó.
          </span>
        </p>
      ) : null}
    </div>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API is unavailable in insecure contexts; nothing to copy to.
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleCopy}
      aria-label={label}
      className="h-7 shrink-0 px-2 text-xs"
    >
      {copied ? (
        <>
          <Check className="mr-1 h-3.5 w-3.5" />
          Đã sao chép
        </>
      ) : (
        <>
          <Copy className="mr-1 h-3.5 w-3.5" />
          Sao chép
        </>
      )}
    </Button>
  )
}
