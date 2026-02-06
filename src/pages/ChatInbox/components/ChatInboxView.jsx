import React from "react";
import { ConfirmDialog } from "./modals/ConfirmDialog";
import { InboxAddTagModal } from "./modals/InboxAddTagModal";
import { LeftPanel } from "./LeftPanel";
import { MiddlePanel } from "./MiddlePanel";
import { RightPanel } from "./RightPanel";

export function ChatInboxView(props) {
  const {
    activeTab,
    agents,
    closeConfirm,
    confirmBusy,
    confirmState,
    contactSummary,
    currentUserId,
    editNoteContent,
    editReminderDescription,
    editReminderDueAt,
    editReminderTitle,
    editingNoteId,
    editingReminderId,
    executeDelete,
    fetchConversationsPage,
    filteredConversations,
    handleAddNote,
    handleAddReminder,
    handleAssignToMe,
    handleAssignToAgent,
    handleComposerKeyDown,
    handleOpenFullCrm,
    handleOpenMedia,
    handleCloseMediaViewer,
    handleMediaViewerPrev,
    handleMediaViewerNext,
    handleMediaViewerSelectIndex,
    ensureImagePreview,
    ensurePdfPreview,
    handleRemoveTag,
    handleSendMessage,
    handleUploadAndSendMedia,
    handleSendLocation,
    handleUnassign,
    handleUpdateConversationStatus,
    handleUpdateNote,
    handleUpdateReminder,
    headerAssignedName,
    headerIsAssigned,
    headerIsAssignedToMe,
    isAssigning,
    isConnected,
    isLoading,
    isConversationsLoadingMore,
    isMessagesLoading,
    isMessagesLoadingOlder,
    isSavingNote,
    isSavingReminder,
    isSending,
    isUploadingMedia,
    isSummaryLoading,
    isTagModalOpen,
    isConversationClosed,
    isUpdatingStatus,
    isUpdatingNote,
    isUpdatingReminder,
    isWithin24h,
    isAgentsLoading,
    mediaObjectUrlById,
    pdfPreviewById,
    mediaViewer,
    messages,
    messagesEndRef,
    messagesHasMore,
    fetchMessagesPage,
    messagesWithSeparators,
    newMessage,
    nextReminder,
    noteDraft,
    openDeleteConfirm,
    recentNotes,
    recentTimeline,
    refreshContactSummary,
    reminderDescription,
    reminderDueAt,
    reminderTitle,
    removingTagId,
    searchTerm,
    selectedContactId,
    selectedConversation,
    selectedConversationId,
    selectedNumberId,
    setActiveTab,
    setEditNoteContent,
    setEditReminderDescription,
    setEditReminderDueAt,
    setEditReminderTitle,
    setEditingNoteId,
    setEditingReminderId,
    setIsTagModalOpen,
    setNewMessage,
    setNoteDraft,
    setReminderDescription,
    setReminderDueAt,
    setReminderTitle,
    setSearchTerm,
    setSelectedConversationId,
    setSelectedNumberId,
    setShowDetails,
    setShowRightPanel,
    showCrmPanel,
    showDetails,
    showRightPanel,
    tagsList,
    conversationsHasMore,
  } = props;

  const [assigneeMenuOpen, setAssigneeMenuOpen] = React.useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setAssigneeMenuOpen(false);
    setStatusMenuOpen(false);
  }, [selectedConversationId]);

  const normalizedStatus = React.useMemo(() => {
    const raw = String(selectedConversation?.status ?? "").trim().toLowerCase();
    if (raw === "pending") return "Pending";
    if (raw === "closed") return "Closed";
    return "Open";
  }, [selectedConversation?.status]);

  const statusPillClass =
    normalizedStatus === "Closed"
      ? "bg-slate-100 text-slate-700 border-slate-200"
      : normalizedStatus === "Pending"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-emerald-50 text-emerald-800 border-emerald-200";

  return (
    <div className="h-full flex bg-slate-50">
      <LeftPanel
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedNumberId={selectedNumberId}
        setSelectedNumberId={setSelectedNumberId}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filteredConversations={filteredConversations}
        isLoading={isLoading}
        conversationsHasMore={conversationsHasMore}
        isConversationsLoadingMore={isConversationsLoadingMore}
        onLoadMoreConversations={() => fetchConversationsPage({ append: true })}
        selectedConversationId={selectedConversationId}
        setSelectedConversationId={setSelectedConversationId}
        isConnected={isConnected}
      />

      <MiddlePanel
        selectedConversation={selectedConversation}
        messages={messages}
        mediaObjectUrlById={mediaObjectUrlById}
        pdfPreviewById={pdfPreviewById}
        mediaViewer={mediaViewer}
        handleMediaViewerPrev={handleMediaViewerPrev}
        handleMediaViewerNext={handleMediaViewerNext}
        handleMediaViewerSelectIndex={handleMediaViewerSelectIndex}
        messagesEndRef={messagesEndRef}
        messagesWithSeparators={messagesWithSeparators}
        messagesHasMore={messagesHasMore}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        isSending={isSending}
        isUploadingMedia={isUploadingMedia}
        handleSendMessage={handleSendMessage}
        handleUploadAndSendMedia={handleUploadAndSendMedia}
        handleSendLocation={handleSendLocation}
        handleOpenMedia={handleOpenMedia}
        handleCloseMediaViewer={handleCloseMediaViewer}
        ensureImagePreview={ensureImagePreview}
        ensurePdfPreview={ensurePdfPreview}
        handleComposerKeyDown={handleComposerKeyDown}
        headerIsAssigned={headerIsAssigned}
        headerIsAssignedToMe={headerIsAssignedToMe}
        headerAssignedName={headerAssignedName}
        isWithin24h={isWithin24h}
        normalizedStatus={normalizedStatus}
        statusPillClass={statusPillClass}
        agents={agents}
        isAgentsLoading={isAgentsLoading}
        currentUserId={currentUserId}
        isAssigning={isAssigning}
        handleAssignToMe={handleAssignToMe}
        handleAssignToAgent={handleAssignToAgent}
        handleUnassign={handleUnassign}
        isUpdatingStatus={isUpdatingStatus}
        handleUpdateConversationStatus={handleUpdateConversationStatus}
        isMessagesLoading={isMessagesLoading}
        isMessagesLoadingOlder={isMessagesLoadingOlder}
        onLoadOlderMessages={() => fetchMessagesPage({ prepend: true })}
        isConversationClosed={isConversationClosed}
        showRightPanel={showRightPanel}
        setShowRightPanel={setShowRightPanel}
        assigneeMenuOpen={assigneeMenuOpen}
        setAssigneeMenuOpen={setAssigneeMenuOpen}
        statusMenuOpen={statusMenuOpen}
        setStatusMenuOpen={setStatusMenuOpen}
      />

      <RightPanel
        selectedConversation={selectedConversation}
        selectedContactId={selectedContactId}
        contactSummary={contactSummary}
        isSummaryLoading={isSummaryLoading}
        showRightPanel={showRightPanel}
        setShowDetails={setShowDetails}
        showCrmPanel={showCrmPanel}
        showDetails={showDetails}
        tagsList={tagsList}
        recentNotes={recentNotes}
        recentTimeline={recentTimeline}
        nextReminder={nextReminder}
        handleOpenFullCrm={handleOpenFullCrm}
        handleRemoveTag={handleRemoveTag}
        removingTagId={removingTagId}
        setIsTagModalOpen={setIsTagModalOpen}
        normalizedStatus={normalizedStatus}
        openDeleteConfirm={openDeleteConfirm}
        handleAddReminder={handleAddReminder}
        handleUpdateReminder={handleUpdateReminder}
        isSavingReminder={isSavingReminder}
        isUpdatingReminder={isUpdatingReminder}
        reminderTitle={reminderTitle}
        setReminderTitle={setReminderTitle}
        reminderDueAt={reminderDueAt}
        setReminderDueAt={setReminderDueAt}
        reminderDescription={reminderDescription}
        setReminderDescription={setReminderDescription}
        editingReminderId={editingReminderId}
        setEditingReminderId={setEditingReminderId}
        editReminderTitle={editReminderTitle}
        setEditReminderTitle={setEditReminderTitle}
        editReminderDueAt={editReminderDueAt}
        setEditReminderDueAt={setEditReminderDueAt}
        editReminderDescription={editReminderDescription}
        setEditReminderDescription={setEditReminderDescription}
        handleAddNote={handleAddNote}
        handleUpdateNote={handleUpdateNote}
        isSavingNote={isSavingNote}
        isUpdatingNote={isUpdatingNote}
        noteDraft={noteDraft}
        setNoteDraft={setNoteDraft}
        editingNoteId={editingNoteId}
        setEditingNoteId={setEditingNoteId}
        editNoteContent={editNoteContent}
        setEditNoteContent={setEditNoteContent}
      />

      <InboxAddTagModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        contactId={selectedContactId}
        currentTags={tagsList}
        onTagAdded={refreshContactSummary}
      />

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger
        loading={confirmBusy}
        onCancel={closeConfirm}
        onConfirm={executeDelete}
      />
    </div>
  );
}
