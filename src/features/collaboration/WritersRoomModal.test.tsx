import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { WritersRoomModal } from './WritersRoomModal';

// Mock hook and stores
const mockConnectToRoom = vi.fn();
const mockDisconnect = vi.fn();
const mockSetWritersRoomRole = vi.fn();
const mockSendWritersRoomMessage = vi.fn();
const mockUpdateSceneFocus = vi.fn();

vi.mock('@shared/hooks/useCollaborativeProject', () => ({
  useCollaborativeProject: () => ({
    isConnected: true,
    connectToRoom: mockConnectToRoom,
    disconnect: mockDisconnect,
    activeUsers: [
      {
        clientId: 2,
        userId: 'user-2',
        name: 'Director Alice',
        color: '#f59e0b',
        writersRoomRole: 'director',
        focusSceneTitle: 'INT. SAFE HOUSE',
        isEditing: true,
      },
    ],
    roomId: 'room-writers-1',
    currentUserColor: '#3b82f6',
    setWritersRoomRole: mockSetWritersRoomRole,
    sendWritersRoomMessage: mockSendWritersRoomMessage,
    updateSceneFocus: mockUpdateSceneFocus,
  }),
}));

const mockSetLanSignalingConfig = vi.fn();

vi.mock('@core/store/useCollaborationStore', () => {
  const store = {
    currentUser: { id: 'user-1', displayName: 'Nova Writer', avatarColor: '#3b82f6' },
    activeRoom: { id: 'room-writers-1' },
    connectionStatus: 'connected',
    lanSignalingConfig: {
      mode: 'local_lan',
      customUrl: '',
      roomPassword: 'test-passphrase',
    },
    writersRoomRole: 'screenwriter',
    writersRoomMessages: [
      {
        id: 'msg-1',
        senderId: 'user-2',
        senderName: 'Director Alice',
        senderRole: 'director',
        senderColor: '#f59e0b',
        text: 'Öka kontrasten i scen 2',
        timestamp: Date.now() - 5000,
        type: 'director_note',
        targetSceneTitle: 'INT. SAFE HOUSE',
      },
    ],
    setActiveRoom: vi.fn(),
    setLanSignalingConfig: (...args: unknown[]) => mockSetLanSignalingConfig(...args),
  };
  return {
    useCollaborationStore: Object.assign(() => store, { getState: () => store }),
  };
});

vi.mock('@core/store/useAppStore', () => ({
  useAppStore: () => ({
    sbShots: [{ id: 1, title: 'Shot 1' }],
  }),
}));

describe('WritersRoomModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(
      <WritersRoomModal
        isOpen={true}
        onClose={vi.fn()}
        projectId="proj-1"
        projectName="Cyberpunk Pilot"
      />,
    );

    expect(screen.getByText("Virtual Writers' Room & LAN Staging")).toBeInTheDocument();
    expect(screen.getByText(/P2P Mesh/)).toBeInTheDocument();
    expect(screen.getByText('E2E Krypterad')).toBeInTheDocument();
    expect(screen.getByText('Kopiera LAN-kod')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <WritersRoomModal
        isOpen={false}
        onClose={vi.fn()}
        projectId="proj-1"
        projectName="Cyberpunk Pilot"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('displays existing messages and filters by category', () => {
    render(
      <WritersRoomModal
        isOpen={true}
        onClose={vi.fn()}
        projectId="proj-1"
        projectName="Cyberpunk Pilot"
      />,
    );

    // Initial message exists
    expect(screen.getByText('Öka kontrasten i scen 2')).toBeInTheDocument();
    expect(screen.getByText('Director Alice')).toBeInTheDocument();

    // Click filter for chat only (which has 0 messages)
    const chatButtons = screen.getAllByText('💬 Chatt');
    fireEvent.click(chatButtons[0]);
    expect(screen.queryByText('Öka kontrasten i scen 2')).not.toBeInTheDocument();

    // Click filter for director notes
    fireEvent.click(screen.getByText('🎬 Regissör'));
    expect(screen.getByText('Öka kontrasten i scen 2')).toBeInTheDocument();
  });

  it('sends a new message when form is submitted', () => {
    render(
      <WritersRoomModal
        isOpen={true}
        onClose={vi.fn()}
        projectId="proj-1"
        projectName="Cyberpunk Pilot"
      />,
    );

    const input = screen.getByPlaceholderText(/Skriv ett meddelande till författarrummet/i);
    fireEvent.change(input, { target: { value: 'Ny replik för Nova klar!' } });

    const sendBtn = screen.getByRole('button', { name: 'Skicka' });
    fireEvent.click(sendBtn);

    expect(mockSendWritersRoomMessage).toHaveBeenCalledWith(
      'Ny replik för Nova klar!',
      'chat',
      undefined,
      undefined,
    );
  });

  it('navigates to Roles tab and selects a new creative role', () => {
    render(
      <WritersRoomModal
        isOpen={true}
        onClose={vi.fn()}
        projectId="proj-1"
        projectName="Cyberpunk Pilot"
      />,
    );

    // Switch to Roles tab
    fireEvent.click(screen.getByText('Kreativa Roller & Deltagare'));

    expect(screen.getByText('Min Kreativa Roll')).toBeInTheDocument();
    expect(screen.getByText('Director Alice')).toBeInTheDocument();

    // Click on Ljud / SFX role
    fireEvent.click(screen.getByText('Ljud / SFX'));
    expect(mockSetWritersRoomRole).toHaveBeenCalledWith('sound_designer');
  });

  it('navigates to Network tab and allows copying LAN code and joining', () => {
    render(
      <WritersRoomModal
        isOpen={true}
        onClose={vi.fn()}
        projectId="proj-1"
        projectName="Cyberpunk Pilot"
      />,
    );

    // Switch to Network tab
    fireEvent.click(screen.getByText('LAN & P2P Inställningar'));

    expect(screen.getByText('Dela LAN-parningskod')).toBeInTheDocument();
    expect(screen.getByText('Gå med i ett befintligt LAN-rum')).toBeInTheDocument();

    // Enter join code and click Anslut
    const joinInput = screen.getByPlaceholderText(/Klistra in LOOFI-ROOM-... kod/i);
    fireEvent.change(joinInput, { target: { value: 'custom-room-xyz' } });

    const joinBtn = screen.getByRole('button', { name: 'Anslut' });
    fireEvent.click(joinBtn);

    expect(mockConnectToRoom).toHaveBeenCalledWith('custom-room-xyz', {
      role: 'screenwriter',
    });
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <WritersRoomModal
        isOpen={true}
        onClose={onClose}
        projectId="proj-1"
        projectName="Cyberpunk Pilot"
      />,
    );

    const closeBtn = screen.getByLabelText('Stäng författarrummet');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
