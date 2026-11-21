'use client'
// ---------------------------------------------------------------------------
// _components/user-info-dialog.tsx
// Read-only user profile dialog — opened from Users table "View Info" action
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  User,
  Shield,
  Phone,
  Heart,
  Briefcase,
  CreditCard,
  FileCheck,
  FileText,
  Loader2,
  Download,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { fetchAccountInfo, getUserFileUrl } from '@/features/lms/lib/users/api'
import { userKeys } from '@/features/lms/lib/users/query-keys'
import {
  getInitials,
  isUserActive,
  parseAssignedCampuses,
  roleRequiresBranch,
  DOCUMENT_TYPES,
} from '@/features/lms/types/user'
import type { AccountInfo } from '@/features/lms/types/user'
import { apiFetch, downloadAuthenticated } from '@/lib/api-client'
import { toast } from 'sonner'
import { ManagementError } from '../management-error'

function UserAvatar({ id, fileName, name }: { id: string; fileName: string | null; name: string | null }) {
  const [src, setSrc] = useState<string>()

  useEffect(() => {
    if (!fileName) return
    const controller = new AbortController()
    let objectUrl: string | undefined
    void apiFetch<Blob>(getUserFileUrl(id, fileName), {
      responseType: 'blob',
      signal: controller.signal,
    }).then(blob => {
      if (!controller.signal.aborted && blob?.type.startsWith('image/')) {
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      }
    }).catch(() => undefined)

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id, fileName])

  return (
    <Avatar className="size-14">
      {src && <AvatarImage src={src} alt={name ?? ''} />}
      <AvatarFallback className="text-base">{getInitials(name)}</AvatarFallback>
    </Avatar>
  )
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function InfoSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">{children}</div>
    </div>
  )
}

function InfoField({
  label,
  value,
  colSpan,
}: {
  label: string
  value: string | null | undefined
  colSpan?: 2
}) {
  return (
    <div className={colSpan === 2 ? 'col-span-2' : ''}>
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <p className="text-sm mt-0.5">{value || '—'}</p>
    </div>
  )
}

function FileField({
  label,
  fileName,
  userId,
}: {
  label: string
  fileName: string | null | undefined
  userId: string
}) {
  const [downloading, setDownloading] = useState(false)

  async function download() {
    if (!fileName || downloading) return
    setDownloading(true)
    try {
      await downloadAuthenticated(getUserFileUrl(userId, fileName), fileName)
    } catch {
      toast.error('Could not download the document')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div>
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      {fileName ? (
        <button
          type="button"
          disabled={downloading}
          onClick={() => void download()}
          className="flex min-w-0 items-center gap-1 mt-0.5 text-left text-sm text-primary hover:underline"
        >
          {fileName}
          <Download className="size-3 shrink-0" />
        </button>
      ) : (
        <p className="text-sm mt-0.5 text-muted-foreground">—</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UserInfoDialogProps {
  userId: string | null
  campuses: readonly { id: string; name: string }[]
  open: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserInfoDialog({
  userId,
  campuses,
  open,
  onClose,
}: UserInfoDialogProps) {
  const { data, error, refetch } = useQuery({
    queryKey: userKeys.detail(userId ?? ''),
    queryFn: () => fetchAccountInfo(userId!),
    enabled: !!userId && open,
  })
  const assignment = parseAssignedCampuses(data?.assignedCampus, campuses.map(campus => campus.name))
  const assignedCampuses = assignment.needsReview && data?.assignedCampus
    ? [data.assignedCampus]
    : assignment.values.map(value => campuses.find(campus => campus.id === value)?.name ?? value)

  const handleOpenChange = useCallback(
    (o: boolean) => {
      if (!o) onClose()
    },
    [onClose],
  )

  function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return iso
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>User Information</DialogTitle>
          <DialogDescription className="sr-only">Read this user’s profile and documents.</DialogDescription>
        </DialogHeader>

        {error ? (
          <ManagementError resource="user information" error={error} onRetry={() => void refetch()} />
        ) : !data ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-y-auto px-6 pb-6 max-h-[calc(85vh-5rem)]">
            <div className="space-y-5">
              {/* Header: Avatar + Name + Status */}
              <div className="flex items-center gap-4">
                <UserAvatar key={data.avatarImage} id={data.id} fileName={data.avatarImage} name={data.fullName} />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold truncate">
                    {data.fullName || 'Unknown User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {data.email}
                  </p>
                </div>
                <Badge
                  variant={isUserActive(data) ? 'default' : 'secondary'}
                  className={
                    isUserActive(data)
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : ''
                  }
                >
                  {isUserActive(data) ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <Separator />

              {/* Basic Info */}
              <InfoSection icon={User} title="Basic Info">
                <InfoField label="English Name" value={data.englishName} />
                <InfoField label="Date of Birth" value={formatDate(data.dateOfBirth)} />
                <InfoField label="Gender" value={data.gender} />
                <InfoField label="Country" value={data.country} />
                <InfoField label="Marital Status" value={data.maritalStatus} />
              </InfoSection>

              <Separator />

              {/* Role & Campus */}
              <InfoSection icon={Shield} title="Role & Campus">
                <InfoField label="Role" value={data.roleId} />
                {roleRequiresBranch(data.roleId) && (
                  <InfoField
                    label="Assigned Campus"
                    value={assignedCampuses.join(', ')}
                    colSpan={2}
                  />
                )}
              </InfoSection>

              {/* Campus Warning - for users with role requiring campus but no assignment */}
              {roleRequiresBranch(data.roleId) && assignedCampuses.length === 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">Campus Not Assigned</p>
                  <p className="text-xs mt-1">
                    Please contact your administrator to set up campus access.
                  </p>
                </div>
              )}

              <Separator />

              {/* Contact */}
              <InfoSection icon={Phone} title="Contact">
                <InfoField label="Email" value={data.email} />
                <InfoField label="Phone" value={data.phoneNumber} />
                <InfoField
                  label="Permanent Address"
                  value={data.permanentAddress}
                  colSpan={2}
                />
                <InfoField
                  label="Temporary Address"
                  value={data.temporaryAddress}
                  colSpan={2}
                />
              </InfoSection>

              <Separator />

              {/* Emergency */}
              <InfoSection icon={Heart} title="Emergency Contact">
                <InfoField label="Contact Name" value={data.contactName} />
                <InfoField label="Phone" value={data.contactPhone} />
                <InfoField label="Relationship" value={data.relationship} />
              </InfoSection>

              <Separator />

              {/* Employment */}
              <InfoSection icon={Briefcase} title="Employment">
                <InfoField label="Join Date" value={formatDate(data.joinAt)} />
                <InfoField
                  label="Employment Type"
                  value={data.employmentType}
                />
              </InfoSection>

              <Separator />

              {/* CCCD */}
              <InfoSection icon={CreditCard} title="Identification">
                <InfoField label="CCCD" value={data.cccd} />
                <InfoField label="Date of Issue" value={formatDate(data.dateOfIssue)} />
                <InfoField
                  label="Place of Issue"
                  value={data.placeOfIssue}
                  colSpan={2}
                />
                <FileField
                  label="Front Image"
                  fileName={data.frontImage}
                  userId={data.id}
                />
                <FileField
                  label="Back Image"
                  fileName={data.backImage}
                  userId={data.id}
                />
              </InfoSection>

              <Separator />

              {/* Insurance & Tax */}
              <InfoSection icon={FileCheck} title="Insurance & Tax">
                <InfoField
                  label="Social Insurance #"
                  value={data.socialInsuranceNumber}
                />
                <InfoField
                  label="SI Issue Date"
                  value={formatDate(data.socialInsuranceIssueDate)}
                />
                <InfoField
                  label="Tax ID"
                  value={data.taxIdentificationNumber}
                />
                <InfoField
                  label="Tax Issue Date"
                  value={formatDate(data.taxIssueDate)}
                />
              </InfoSection>

              <Separator />

              {/* Documents */}
              <InfoSection icon={FileText} title="Documents">
                {DOCUMENT_TYPES.map((doc) => (
                  <FileField
                    key={doc.key}
                    label={doc.label}
                    fileName={
                      data[doc.key as keyof AccountInfo] as string | null
                    }
                    userId={data.id}
                  />
                ))}
              </InfoSection>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
