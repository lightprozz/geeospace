'use client'

import React from 'react'
import { X, Clock, FolderOpen, BookOpen, Edit, Trash2 } from 'lucide-react'
import { usePermission } from '@/features/lms/port-support'
import type { UnitListItem } from '@/features/lms/types/curriculum'

interface UnitDetailPaneProps {
  unit: UnitListItem
  onClose: () => void
  onDelete: () => void
  onEdit: () => void
}

export function UnitDetailPane({ unit, onClose, onDelete, onEdit }: UnitDetailPaneProps) {
  const { can } = usePermission()
  const canUpdateUnit = can('curriculum.update')
  const canDeleteUnit = can('curriculum.delete')

  return (
    <div className="w-full md:w-[400px] bg-background border-l border-border flex flex-col h-full shrink-0 animate-in fade-in slide-in-from-right-5 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <h3 className="font-bold text-lg text-foreground">Unit Details</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors"
          title="Close Details"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Badges */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            Unit {unit.sortOrder}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" /> {unit.time} min
          </span>
        </div>

        {/* Title */}
        <div>
          <h4 className="text-xl font-bold text-foreground leading-tight">
            {unit.procedures}
          </h4>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Description</label>
            <p className="text-sm text-muted-foreground">{unit.description || 'N/A'}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Materials</label>
            {unit.materials ? (
              <a href={unit.materials} target="_blank" rel="noreferrer" className="block text-sm text-primary hover:underline break-all">
                {unit.materials}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground italic">No materials linked</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Teacher Activities</label>
            <p className="text-sm text-muted-foreground">{unit.teacherActivities || 'N/A'}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Students Learning Outcome</label>
            <p className="text-sm text-muted-foreground">{unit.learningOutcome || 'N/A'}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Note</label>
            <p className="text-sm text-muted-foreground">{unit.note || 'No notes'}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Library Material</label>
            <p className="text-sm text-muted-foreground">{unit.materialName || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-border bg-muted/30 space-y-3 shrink-0">
        <button className="w-full flex items-center justify-start gap-3 px-4 py-3 bg-background border border-border rounded-lg hover:border-input hover:shadow-sm transition-all text-sm font-medium text-foreground">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          Select Categories
        </button>
        <button className="w-full flex items-center justify-start gap-3 px-4 py-3 bg-background border border-border rounded-lg hover:border-input hover:shadow-sm transition-all text-sm font-medium text-foreground">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          Select Material
        </button>
        {canUpdateUnit && (
          <button
            onClick={onEdit}
            className="w-full flex items-center justify-start gap-3 px-4 py-3 bg-background border border-border rounded-lg hover:border-input hover:shadow-sm transition-all text-sm font-medium text-foreground"
          >
            <Edit className="h-4 w-4 text-muted-foreground" />
            Edit Unit
          </button>
        )}
        {canDeleteUnit && (
          <button
            onClick={onDelete}
            className="w-full flex items-center justify-start gap-3 px-4 py-3 bg-background border border-destructive/20 rounded-lg hover:bg-destructive/10 hover:border-destructive/30 transition-all text-sm font-medium text-destructive"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
            Delete Unit
          </button>
        )}
      </div>
    </div>
  )
}
