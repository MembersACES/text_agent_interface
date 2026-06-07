"use client";



import { useEffect, useState, type FormEvent } from "react";

import { MemberSubTabs } from "../shared/MemberSubTabs";

import { ActivityTab } from "./ActivityTab";

import { NotesTab } from "./NotesTab";

import type { Note, TimelineEvent } from "../types";

import type { ActivitySubTab } from "../member-tab-utils";



export interface ActivityTabPanelProps {

  initialSubTab?: ActivitySubTab;

  timelineEvents: TimelineEvent[];

  notes: Note[];

  newNote: string;

  newNoteType: string;

  creatingNote: boolean;

  onNewNoteChange: (value: string) => void;

  onNewNoteTypeChange: (value: string) => void;

  onSubmitNote: (e: FormEvent) => void;

  onEditNote: (note: Note) => void;

  onDeleteNote: (noteId: number) => void;

}



export function ActivityTabPanel({

  initialSubTab = "activity",

  timelineEvents,

  notes,

  newNote,

  newNoteType,

  creatingNote,

  onNewNoteChange,

  onNewNoteTypeChange,

  onSubmitNote,

  onEditNote,

  onDeleteNote,

}: ActivityTabPanelProps) {

  const [subTab, setSubTab] = useState<ActivitySubTab>(initialSubTab);

  const activityCount = timelineEvents.length;



  useEffect(() => {

    setSubTab(initialSubTab);

  }, [initialSubTab]);



  return (

    <div className="space-y-4">

      <MemberSubTabs

        className="-mx-1 px-1"

        tabs={[

          { id: "activity", label: "Activity", count: activityCount },

          { id: "notes", label: "Notes", count: notes.length },

        ]}

        active={subTab}

        onChange={(id) => setSubTab(id as ActivitySubTab)}

      />



      {subTab === "activity" && (
        <div key="activity" className="pg-fade-up">
          <ActivityTab timelineEvents={timelineEvents} />
        </div>
      )}

      {subTab === "notes" && (
        <div key="notes" className="pg-fade-up">
        <NotesTab

          notes={notes}

          newNote={newNote}

          newNoteType={newNoteType}

          creatingNote={creatingNote}

          onNewNoteChange={onNewNoteChange}

          onNewNoteTypeChange={onNewNoteTypeChange}

          onSubmitNote={onSubmitNote}

          onEditNote={onEditNote}

          onDeleteNote={onDeleteNote}

        />
        </div>
      )}

    </div>

  );

}

