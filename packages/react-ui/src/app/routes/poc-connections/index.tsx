import { t } from 'i18next';
import { useState, useEffect } from 'react';

import { CreateOrEditConnectionDialogContent } from '@/app/connections/create-edit-connection-dialog';
import { appConnectionsQueries } from '@/features/connections/lib/app-connections-hooks';
import { piecesHooks } from '@/features/pieces/lib/pieces-hooks';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PieceMetadataModelSummary } from '@activepieces/pieces-framework';
import { authenticationSession } from '@/lib/authentication-session';
import { AppConnectionStatus } from '@activepieces/shared';

type ConnectionsTableProps = {
  filteredPieces: PieceMetadataModelSummary[] | undefined;
  connectionStatusMap: Map<string, { connected: boolean; count: number }>;
  onConnect: (piece: PieceMetadataModelSummary) => void;
};

const ConnectionsTable = ({
  filteredPieces,
  connectionStatusMap,
  onConnect,
}: ConnectionsTableProps) => {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Connection Name')}</TableHead>
            <TableHead className="w-[150px]">{t('Action')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPieces && filteredPieces.length > 0 ? (
            filteredPieces.map((piece) => {
              const connectionStatus = connectionStatusMap.get(piece.name);
              const isConnected = connectionStatus?.connected || false;

              return (
                <TableRow key={piece.name}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <img
                        src={piece.logoUrl}
                        alt={piece.displayName}
                        className="w-8 h-8 rounded"
                      />
                      <span>{piece.displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={isConnected ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => onConnect(piece)}
                      disabled={isConnected}
                    >
                      {isConnected ? t('Connected') : t('Connect')}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={2}
                className="text-center text-muted-foreground"
              >
                {t('Loading...')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export const PocConnectionsPage = () => {
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<
    PieceMetadataModelSummary | undefined
  >(undefined);

  // Default pieces to show - see name in new-connection-dialog.tsx
  const defaultPieces = [
    '@activepieces/piece-google-calendar',
    '@activepieces/piece-claude',
  ];

  const [pieceToBeOpen, setPieceToBeOpen] = useState<string[]>(defaultPieces);

  // Load pieces from localStorage on mount
  useEffect(() => {
    const openConnections = JSON.parse(
      localStorage.getItem('openConnections') || '[]'
    );
    if (openConnections.length > 0) {
      setPieceToBeOpen(openConnections);
    }
  }, []);

  const { pieces } = piecesHooks.usePieces({});
  const projectId = authenticationSession.getProjectId();

  // Filter pieces based on the array
  const filteredPieces = pieces?.filter((piece) =>
    pieceToBeOpen.includes(piece.name)
  );

  // Fetch all app connections for the current project
  const {
    data: connectionsData,
    isLoading: connectionsLoading,
    refetch: refetchConnections,
  } = appConnectionsQueries.useAppConnections({
    request: {
      projectId: projectId!,
      cursor: undefined,
      limit: 100,
      status: [],
    },
    extraKeys: [refresh, projectId],
  });

  // Create a map of piece name to connection status
  const connectionStatusMap = new Map<
    string,
    { connected: boolean; count: number }
  >();

  if (connectionsData?.data) {
    connectionsData.data.forEach((connection) => {
      const existing = connectionStatusMap.get(connection.pieceName);
      const isConnected = connection.status === AppConnectionStatus.ACTIVE;

      if (existing) {
        connectionStatusMap.set(connection.pieceName, {
          connected: existing.connected || isConnected,
          count: existing.count + 1,
        });
      } else {
        connectionStatusMap.set(connection.pieceName, {
          connected: isConnected,
          count: 1,
        });
      }
    });
  }

  const handleConnect = (piece: PieceMetadataModelSummary) => {
    setSelectedPiece(piece);
    setOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">{t('Required Connections')}</h1>

      <ConnectionsTable
        filteredPieces={filteredPieces}
        connectionStatusMap={connectionStatusMap}
        onConnect={handleConnect}
      />

      {selectedPiece && (
        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              setSelectedPiece(undefined);
            }
          }}
          key={selectedPiece.name}
        >
          <DialogContent
            onInteractOutside={(e) => e.preventDefault()}
            className="w-screen h-screen max-w-none max-h-none m-0 p-0 overflow-y-auto border-0"
          >
            <div className="p-3">
              <CreateOrEditConnectionDialogContent
                reconnectConnection={null}
                piece={selectedPiece}
                isGlobalConnection={false}
                setOpen={(isOpen, connection) => {
                  setOpen(isOpen);
                  if (!isOpen) {
                    setSelectedPiece(undefined);
                  }
                  if (connection) {
                    setRefresh(refresh + 1);
                    refetchConnections();
                  }
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
