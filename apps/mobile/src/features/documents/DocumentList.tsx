import { useState } from "react";
import { ActionSheetIOS, Platform, View } from "react-native";
import { showAlert } from "@/lib/alert";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Upload } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Button, Card, EmptyState, LoadingRows, Text } from "@/components/ui";
import { DocumentIcon } from "@/features/shared/Items";
import { openDocument, pickAndUploadDocument, shareDocument } from "@/lib/documents";
import { formatBytes, formatDate } from "@/lib/format";
import { errorMessage, toast } from "@/lib/toast";
import type { DocumentRow } from "@/lib/queries";

export function DocumentList({
  userId,
  caseId,
  documents,
  loading,
}: {
  userId: string | undefined;
  caseId?: string;
  documents: DocumentRow[];
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    if (!userId) return;
    setUploading(true);
    try {
      const doc = await pickAndUploadDocument(userId, caseId);
      if (doc) {
        toast.success("Document uploaded");
        qc.invalidateQueries({ queryKey: ["documents", userId] });
      }
    } catch (error) {
      toast.error(errorMessage(error, "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  const actions = (doc: DocumentRow) => {
    const run = (fn: (d: DocumentRow) => Promise<void>) =>
      fn(doc).catch((e) => toast.error(errorMessage(e)));
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: doc.name, options: ["Open", "Share or save", "Cancel"], cancelButtonIndex: 2 },
        (i) => {
          if (i === 0) void run(openDocument);
          if (i === 1) void run(shareDocument);
        },
      );
    } else {
      showAlert(doc.name, undefined, [
        { text: "Open", onPress: () => void run(openDocument) },
        { text: "Share or save", onPress: () => void run(shareDocument) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Button
        title={uploading ? "Uploading…" : "Upload a file"}
        variant="outline"
        icon={<Upload size={16} color={colors.foreground} />}
        loading={uploading}
        disabled={!userId}
        onPress={() => void upload()}
        fullWidth
      />
      {loading ? (
        <LoadingRows rows={3} />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FileText size={22} color={colors.brass} />}
          title="No documents yet"
          description="Upload filings, contracts or evidence to keep them with your matters."
        />
      ) : (
        documents.map((doc) => (
          <Card
            key={doc.id}
            onPress={() => actions(doc)}
            accessibilityLabel={`Document ${doc.name}`}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <DocumentIcon />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {doc.name}
                </Text>
                <Text variant="small" tone="muted">
                  {doc.category} · {formatBytes(doc.size_bytes)} · {formatDate(doc.created_at)}
                </Text>
              </View>
            </View>
          </Card>
        ))
      )}
    </View>
  );
}
