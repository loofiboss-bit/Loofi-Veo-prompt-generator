/**
 * WritersRoomModal Component
 * v13.0.0 - Milestone 6: P2P Virtual Writers' Room
 *
 * Dedicated studio modal for local-network P2P collaboration.
 * Enables screenwriters, directors, sound designers, and editors to collaborate
 * in real-time over LAN via WebRTC CRDTs with creative roles, live feeds,
 * and copyable LAN pairing codes.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useCollaborationStore } from '@core/store/useCollaborationStore';
import { useCollaborativeProject } from '@shared/hooks/useCollaborativeProject';
import { writersRoomP2PService, WRITERS_ROOM_ROLES } from '@core/services/writersRoomP2PService';
import type { WritersRoomRole, WritersRoomMessageType, WritersRoomLANInvite } from '@core/types';
import Icon from '@shared/components/ui/Icon';

export interface WritersRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
}

type ModalTab = 'feed' | 'roles' | 'network';

export function WritersRoomModal({
  isOpen,
  onClose,
  projectId = 'default',
  projectName = 'Loofi Project',
}: WritersRoomModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('feed');
  const [feedFilter, setFeedFilter] = useState<WritersRoomMessageType | 'all'>('all');

  // Input states
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<WritersRoomMessageType>('chat');
  const [targetSceneTitle, setTargetSceneTitle] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Network testing states
  const [isTestingSignaling, setIsTestingSignaling] = useState(false);
  const [signalingStatus, setSignalingStatus] = useState<{
    tested: boolean;
    ok: boolean;
    latencyMs?: number;
    error?: string;
  }>({ tested: false, ok: false });

  // Store states
  const {
    currentUser,
    activeRoom,
    connectionStatus,
    lanSignalingConfig,
    writersRoomRole,
    writersRoomMessages,
    setLanSignalingConfig,
  } = useCollaborationStore();

  const {
    isConnected,
    connectToRoom,
    disconnect,
    activeUsers,
    roomId,
    setWritersRoomRole,
    sendWritersRoomMessage,
    updateSceneFocus,
  } = useCollaborativeProject();

  // Active current room identifier
  const currentRoomIdentifier = roomId || activeRoom?.id || `room-${projectId}`;

  // Generated LAN Invite object
  const currentLanInvite = useMemo<WritersRoomLANInvite>(() => {
    return {
      version: 1,
      roomId: currentRoomIdentifier,
      roomName: projectName,
      projectId,
      signalingUrls: writersRoomP2PService.getSignalingUrls(lanSignalingConfig),
      roomPassword: lanSignalingConfig.roomPassword || undefined,
      hostDisplayName: currentUser?.displayName || 'Host',
      createdAt: Date.now(),
    };
  }, [currentRoomIdentifier, projectName, projectId, lanSignalingConfig, currentUser]);

  // Copyable pairing code
  const lanInviteCode = useMemo(() => {
    try {
      return writersRoomP2PService.createLanInviteCode(currentLanInvite);
    } catch {
      return '';
    }
  }, [currentLanInvite]);

  // Copy LAN invite code to clipboard
  const handleCopyInviteCode = useCallback(async () => {
    if (!lanInviteCode) return;
    try {
      await navigator.clipboard.writeText(lanInviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // Fallback copy
      const input = document.createElement('input');
      input.value = lanInviteCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  }, [lanInviteCode]);

  // Join via LAN code or raw room ID
  const handleJoinViaCode = useCallback(() => {
    setJoinError('');
    const trimmed = joinCodeInput.trim();
    if (!trimmed) {
      setJoinError('Vänligen ange en giltig LAN-kod eller rums-ID.');
      return;
    }

    // Try parsing as structured LOOFI-ROOM- token
    const parsedInvite = writersRoomP2PService.parseLanInviteCode(trimmed);
    if (parsedInvite) {
      // Update store signaling config from invite
      setLanSignalingConfig({
        roomPassword: parsedInvite.roomPassword || '',
      });

      connectToRoom(parsedInvite.roomId, {
        signalingUrls: parsedInvite.signalingUrls,
        roomPassword: parsedInvite.roomPassword,
        role: writersRoomRole,
      });
      setJoinCodeInput('');
      setActiveTab('feed');
      return;
    }

    // Otherwise connect directly using the string as room name
    connectToRoom(trimmed, {
      role: writersRoomRole,
    });
    setJoinCodeInput('');
    setActiveTab('feed');
  }, [joinCodeInput, connectToRoom, writersRoomRole, setLanSignalingConfig]);

  // Send collaborative message
  const handleSendMessage = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!messageText.trim()) return;

      sendWritersRoomMessage(messageText, messageType, undefined, targetSceneTitle || undefined);

      setMessageText('');
    },
    [messageText, messageType, targetSceneTitle, sendWritersRoomMessage],
  );

  // Role selector handler
  const handleRoleSelect = useCallback(
    (newRole: WritersRoomRole) => {
      setWritersRoomRole(newRole);
    },
    [setWritersRoomRole],
  );

  // Test signaling connection
  const handleTestSignaling = useCallback(async () => {
    setIsTestingSignaling(true);
    setSignalingStatus({ tested: false, ok: false });

    const urls = writersRoomP2PService.getSignalingUrls(lanSignalingConfig);
    const targetUrl = urls[0] || 'ws://localhost:4444';

    const result = await writersRoomP2PService.checkSignalingHealth(targetUrl, 2500);
    setSignalingStatus({
      tested: true,
      ok: result.ok,
      latencyMs: result.latencyMs,
      error: result.error,
    });
    setIsTestingSignaling(false);
  }, [lanSignalingConfig]);

  // Filter messages
  const filteredMessages = useMemo(() => {
    return writersRoomP2PService.filterMessagesByType(writersRoomMessages, feedFilter);
  }, [writersRoomMessages, feedFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="writers-room-title"
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-700/80 bg-slate-900/95 text-slate-100 shadow-2xl overflow-hidden"
      >
        {/* ── Modal Header ── */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-950/60 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
              <Icon name="users" className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="writers-room-title"
                  className="text-base font-bold text-white tracking-tight"
                >
                  Virtual Writers&apos; Room &amp; LAN Staging
                </h2>
                {/* Connection Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                    isConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : connectionStatus === 'connecting'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected
                        ? 'bg-emerald-400 animate-pulse'
                        : connectionStatus === 'connecting'
                          ? 'bg-amber-400 animate-ping'
                          : 'bg-slate-500'
                    }`}
                  />
                  {isConnected
                    ? `P2P Mesh (${activeUsers.length + 1} anslutna)`
                    : connectionStatus === 'connecting'
                      ? 'Ansluter...'
                      : 'Lokal (Frånkopplad)'}
                </span>

                {/* Encryption Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                    lanSignalingConfig.roomPassword
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                  title={
                    lanSignalingConfig.roomPassword
                      ? 'End-to-End AES-GCM kryptering aktiv'
                      : 'Öppen kanal (Inget lösenord)'
                  }
                >
                  <Icon
                    name={lanSignalingConfig.roomPassword ? 'lock' : 'unlock'}
                    className="w-3 h-3"
                  />
                  {lanSignalingConfig.roomPassword ? 'E2E Krypterad' : 'Öppen'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kollaborativt manusarbete och sekvensstaging över lokalt nätverk (WebRTC CRDT)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Copy LAN Code */}
            <button
              onClick={handleCopyInviteCode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                copiedCode
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Kopiera LAN-parningskod för medarbetare på samma WiFi"
            >
              <Icon name="code" className="w-3.5 h-3.5" />
              <span>{copiedCode ? 'Kopierad! ✓' : 'Kopiera LAN-kod'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Stäng författarrummet"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'feed'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon name="document" className="w-4 h-4" />
            <span>Författarrum & Regi-feed</span>
            {writersRoomMessages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-mono">
                {writersRoomMessages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'roles'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon name="users" className="w-4 h-4" />
            <span>Kreativa Roller & Deltagare</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {activeUsers.length + 1}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'network'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon name="settings" className="w-4 h-4" />
            <span>LAN & P2P Inställningar</span>
          </button>
        </div>

        {/* ── Tab Content Area ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[380px]">
          {/* TAB 1: FEED & NOTES */}
          {activeTab === 'feed' && (
            <div className="flex flex-col h-full space-y-4">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-800/80">
                <span className="text-[11px] font-medium text-slate-400 mr-1">Filter:</span>
                {(
                  [
                    { id: 'all', label: 'Alla' },
                    { id: 'director_note', label: '🎬 Regissör' },
                    { id: 'script_revision', label: '📝 Manus' },
                    { id: 'audio_cue_note', label: '🔊 Foley / SFX' },
                    { id: 'chat', label: '💬 Chatt' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFeedFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      feedFilter === f.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto space-y-3 min-h-[220px] max-h-[360px] pr-1">
                {filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2">
                    <Icon name="document" className="w-8 h-8 text-slate-600 stroke-1" />
                    <p className="text-xs">Inga meddelanden i författarrummet än.</p>
                    <p className="text-[11px] text-slate-600 max-w-sm">
                      Dela regi-noteringar, förfina dialoger eller synka ljudkrav med dina
                      medskapare nedan.
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const roleConfig =
                      WRITERS_ROOM_ROLES[msg.senderRole] || WRITERS_ROOM_ROLES.viewer;
                    const isDirector = msg.type === 'director_note';
                    const isAudio = msg.type === 'audio_cue_note';
                    const isScript = msg.type === 'script_revision';

                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isDirector
                            ? 'bg-amber-950/20 border-amber-500/30'
                            : isAudio
                              ? 'bg-cyan-950/20 border-cyan-500/30'
                              : isScript
                                ? 'bg-emerald-950/20 border-emerald-500/30'
                                : 'bg-slate-800/40 border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                              style={{ backgroundColor: msg.senderColor }}
                            >
                              {msg.senderName.charAt(0).toUpperCase()}
                            </span>
                            <span className="text-xs font-semibold text-slate-200">
                              {msg.senderName}
                            </span>
                            {/* Role Badge */}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${roleConfig.badgeColor}`}
                            >
                              {roleConfig.shortLabel}
                            </span>
                            {/* Type Pill */}
                            {msg.type !== 'chat' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300 uppercase tracking-wider font-mono">
                                {msg.type.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {msg.targetSceneTitle && (
                          <div className="text-[10px] text-indigo-300 font-mono mb-1">
                            Scen: {msg.targetSceneTitle}
                          </div>
                        )}

                        <p className="text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Compose Box */}
              <form
                onSubmit={handleSendMessage}
                className="pt-2 border-t border-slate-800 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Message Type Selector */}
                  <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
                    {(
                      [
                        { id: 'chat', label: '💬 Chatt' },
                        { id: 'director_note', label: '🎬 Regissörsnotis' },
                        { id: 'script_revision', label: '📝 Manusnotis' },
                        { id: 'audio_cue_note', label: '🔊 Ljudkrav' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setMessageType(t.id)}
                        className={`px-2 py-0.8 rounded text-[11px] font-medium transition-colors ${
                          messageType === t.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Target Scene Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Scen:</span>
                    <input
                      type="text"
                      value={targetSceneTitle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTargetSceneTitle(val);
                        updateSceneFocus(val || undefined);
                      }}
                      placeholder="t.ex. INT. SAFE HOUSE"
                      className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 w-36 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={
                      messageType === 'director_note'
                        ? 'Skriv en regi-notering (t.ex. "Öka kamerans rörelsehastighet i nästa tagning")...'
                        : messageType === 'audio_cue_note'
                          ? 'Specificera ljudeffekt eller foley (t.ex. "Dämpa musiken under dialogen här")...'
                          : messageType === 'script_revision'
                            ? 'Revidera replik eller dialog...'
                            : 'Skriv ett meddelande till författarrummet...'
                    }
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    Skicka
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: ROLES & PARTICIPANTS */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              {/* My Role Configuration */}
              <div className="bg-slate-800/40 border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Min Kreativa Roll
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Välj din ansvarsroll i produktionen. Rollen synkas till alla deltagare i
                      mesh-nätverket.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${WRITERS_ROOM_ROLES[writersRoomRole].badgeColor}`}
                  >
                    {WRITERS_ROOM_ROLES[writersRoomRole].label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {(Object.keys(WRITERS_ROOM_ROLES) as WritersRoomRole[]).map((rKey) => {
                    const rConfig = WRITERS_ROOM_ROLES[rKey];
                    const isSelected = writersRoomRole === rKey;

                    return (
                      <button
                        key={rKey}
                        onClick={() => handleRoleSelect(rKey)}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/50 shadow-md'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Icon name={rConfig.icon} className="w-3.5 h-3.5 text-indigo-400" />
                            {rConfig.shortLabel}
                          </span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {rConfig.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Participants in Mesh */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Aktiva Deltagare i Nätverket ({activeUsers.length + 1})
                </h3>

                <div className="space-y-2">
                  {/* Current User Card */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/30">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs"
                        style={{ backgroundColor: currentUser?.avatarColor || '#6366f1' }}
                      >
                        {(currentUser?.displayName || 'Du').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {currentUser?.displayName || 'Du (Lokal Värd)'}
                          </span>
                          <span className="text-[10px] text-indigo-400 font-mono">(Du)</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${WRITERS_ROOM_ROLES[writersRoomRole].badgeColor}`}
                          >
                            {WRITERS_ROOM_ROLES[writersRoomRole].shortLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">🟢 Online • Redigerar aktivt</p>
                      </div>
                    </div>
                  </div>

                  {/* Remote Peers */}
                  {activeUsers.map((user) => {
                    const peerRole = user.writersRoomRole || 'screenwriter';
                    const roleConfig = WRITERS_ROOM_ROLES[peerRole] || WRITERS_ROOM_ROLES.viewer;

                    return (
                      <div
                        key={user.clientId}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/60"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs"
                            style={{ backgroundColor: user.color }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-100">{user.name}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${roleConfig.badgeColor}`}
                              >
                                {roleConfig.shortLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span>🟢 WebRTC P2P</span>
                              {user.focusSceneTitle && (
                                <span className="text-indigo-300 font-mono">
                                  • Scen: {user.focusSceneTitle}
                                </span>
                              )}
                              {user.isEditing && (
                                <span className="text-amber-400 font-medium">✍️ Skriver...</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LAN & P2P SETTINGS */}
          {activeTab === 'network' && (
            <div className="space-y-6">
              {/* LAN Pairing Code Box */}
              <div className="bg-slate-800/40 border border-slate-700/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Dela LAN-parningskod
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Ge denna kod till dina medarbetare på samma lokala nätverk (WiFi/LAN).
                    </p>
                  </div>
                  <button
                    onClick={handleCopyInviteCode}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Icon name="code" className="w-3.5 h-3.5" />
                    <span>{copiedCode ? 'Kopierad!' : 'Kopiera kod'}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={lanInviteCode}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 select-all pr-10"
                  />
                </div>
              </div>

              {/* Join Existing LAN Room */}
              <div className="bg-slate-800/40 border border-slate-700/80 rounded-xl p-4 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Gå med i ett befintligt LAN-rum
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Klistra in en LAN-kod eller ange ett rums-ID direkt för att ansluta.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    placeholder="Klistra in LOOFI-ROOM-... kod eller rums-ID"
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    onClick={handleJoinViaCode}
                    disabled={!joinCodeInput.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    Anslut
                  </button>
                </div>

                {joinError && <p className="text-xs text-rose-400">{joinError}</p>}
              </div>

              {/* Signaling & Network Mode Configuration */}
              <div className="bg-slate-800/40 border border-slate-700/80 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Signaleringsläge (Discovery Mode)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Konfigurera hur noder upptäcker varandra på det lokala nätverket.
                    </p>
                  </div>
                  <button
                    onClick={handleTestSignaling}
                    disabled={isTestingSignaling}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
                  >
                    <Icon name="api" className="w-3.5 h-3.5" />
                    <span>{isTestingSignaling ? 'Testar...' : 'Testa signalering'}</span>
                  </button>
                </div>

                {signalingStatus.tested && (
                  <div
                    className={`p-2.5 rounded-lg text-xs border ${
                      signalingStatus.ok
                        ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-950/30 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {signalingStatus.ok
                      ? `✓ Signalering tillgänglig! Svarstid: ${signalingStatus.latencyMs} ms.`
                      : `✗ Test misslyckades: ${signalingStatus.error || 'Servern svarar inte.'}`}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      {
                        id: 'local_lan',
                        title: 'Lokalt LAN (ws://localhost:4444)',
                        desc: 'Standard lokal studio-server över Wi-Fi/LAN.',
                      },
                      {
                        id: 'broadcast_channel',
                        title: 'Offline BroadcastChannel',
                        desc: 'Noll nätverk, synk mellan flikar på samma dator.',
                      },
                      {
                        id: 'custom',
                        title: 'Anpassad LAN-adress',
                        desc: 'Ange specifik IP och port för dedikerad studio-server.',
                      },
                      {
                        id: 'cloud_fallback',
                        title: 'Publik Moln-fallback',
                        desc: 'WebRTC via publika Yjs signaleringsservrar.',
                      },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setLanSignalingConfig({ mode: mode.id })}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        lanSignalingConfig.mode === mode.id
                          ? 'bg-indigo-950/40 border-indigo-500 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold">{mode.title}</span>
                        {lanSignalingConfig.mode === mode.id && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{mode.desc}</p>
                    </button>
                  ))}
                </div>

                {lanSignalingConfig.mode === 'custom' && (
                  <div className="space-y-1">
                    <label
                      htmlFor="custom-lan-url"
                      className="text-[11px] text-slate-400 font-medium"
                    >
                      Anpassad WebSocket-adress:
                    </label>
                    <input
                      id="custom-lan-url"
                      type="text"
                      value={lanSignalingConfig.customUrl}
                      onChange={(e) => setLanSignalingConfig({ customUrl: e.target.value })}
                      placeholder="ws://192.168.1.120:4444"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                )}

                {/* Room Password (E2E AES-GCM) */}
                <div className="space-y-1 pt-2 border-t border-slate-800/80">
                  <label
                    htmlFor="lan-e2e-password"
                    className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5"
                  >
                    <Icon name="lock" className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Rumslösenord (End-to-End AES-GCM kryptering):</span>
                  </label>
                  <input
                    id="lan-e2e-password"
                    type="password"
                    value={lanSignalingConfig.roomPassword}
                    onChange={(e) => setLanSignalingConfig({ roomPassword: e.target.value })}
                    placeholder="Valfritt lösenord för att kryptera all datatrafik"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    När ett lösenord anges krypteras alla CRDT-meddelanden och tillstånd på
                    klientnivå innan de skickas över nätverket.
                  </p>
                </div>
              </div>

              {/* Session Controls */}
              <div className="flex justify-between items-center pt-2">
                <div>
                  <span className="text-xs text-slate-400">Aktivt Rums-ID: </span>
                  <span className="text-xs font-mono text-indigo-300">{currentRoomIdentifier}</span>
                </div>

                {isConnected ? (
                  <button
                    onClick={disconnect}
                    className="px-4 py-2 bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30 rounded-xl text-xs font-bold transition-all"
                  >
                    Koppla från session
                  </button>
                ) : (
                  <button
                    onClick={() => connectToRoom(currentRoomIdentifier)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    Anslut till författarrummet
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
