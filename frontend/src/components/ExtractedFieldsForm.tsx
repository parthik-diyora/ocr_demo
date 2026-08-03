import { useEffect, useMemo } from "react";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import type {
  ExtractedDocument,
  FieldDefinition
} from "../types/document";

interface ExtractedFieldsFormProps {
  document: ExtractedDocument;
  saving: boolean;
  saved: boolean;
  onSave: (fields: Record<string, string>) => void;
}

const toDateInput = (value: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return parts
    ? `${parts[3]}-${parts[2]!.padStart(2, "0")}-${parts[1]!.padStart(2, "0")}`
    : "";
};

const isCheckedValue = (value: string): boolean =>
  ["true", "yes", "1", "checked", "x"].includes(value.trim().toLowerCase());

const fieldDefault = (definition: FieldDefinition, value: string) => {
  if (definition.type === "date") return toDateInput(value);
  if (definition.type === "checkbox") return isCheckedValue(value) ? "Yes" : "";
  return value;
};

const groupFieldsBySection = (
  fieldDefinitions: Record<string, FieldDefinition>
): Array<[string, Array<[string, FieldDefinition]>]> => {
  const groups = new Map<string, Array<[string, FieldDefinition]>>();

  // Spatial sort: Page ASC -> Vertical Top (y) ASC -> Horizontal Left (x) ASC
  const sortedEntries = Object.entries(fieldDefinitions).sort((a, b) => {
    const defA = a[1];
    const defB = b[1];
    const pageA = defA.page ?? 1;
    const pageB = defB.page ?? 1;
    if (pageA !== pageB) return pageA - pageB;

    const yA = defA.y ?? 0;
    const yB = defB.y ?? 0;
    if (Math.abs(yA - yB) > 0.015) return yA - yB;

    return (defA.x ?? 0) - (defB.x ?? 0);
  });

  for (const [name, definition] of sortedEntries) {
    const section = definition.section ?? "Fields";
    const existing = groups.get(section) ?? [];
    existing.push([name, definition]);
    groups.set(section, existing);
  }

  return Array.from(groups.entries());
};

export const ExtractedFieldsForm = ({
  document,
  saving,
  saved,
  onSave
}: ExtractedFieldsFormProps) => {
  const sections = useMemo(
    () => groupFieldsBySection(document.fieldDefinitions),
    [document.fieldDefinitions]
  );
  const fieldCount = Object.keys(document.fieldDefinitions).length;
  const filledCount = Object.values(document.fields).filter((value) =>
    Boolean(value?.trim())
  ).length;

  const { control, handleSubmit, reset } = useForm<Record<string, string>>({
    defaultValues: Object.fromEntries(
      Object.entries(document.fieldDefinitions).map(([name, definition]) => [
        name,
        fieldDefault(definition, document.fields[name] ?? "")
      ])
    )
  });

  useEffect(() => {
    reset(
      Object.fromEntries(
        Object.entries(document.fieldDefinitions).map(([name, definition]) => [
          name,
          fieldDefault(definition, document.fields[name] ?? "")
        ])
      )
    );
  }, [document, reset]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSave)}
      sx={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Box sx={{ px: 3, py: 1.75 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {document.templateName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {filledCount}/{fieldCount} fields filled from OCR
            </Typography>
          </Box>
          <Chip label={document.template} size="small" variant="outlined" />
        </Stack>
      </Box>
      <Divider />

      <Stack spacing={2.5} sx={{ p: 3, flex: 1, overflowY: "auto" }}>
        {sections.map(([sectionName, fields]) => (
          <Box key={sectionName}>
            {sectionName !== "Detected Fields" &&
              sectionName !== "Form Details" &&
              sectionName !== "Fields" && (
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1.5,
                    pb: 0.75,
                    borderBottom: "2px solid",
                    borderColor: "primary.main",
                    color: "primary.main",
                    fontWeight: 700,
                    letterSpacing: 0.2
                  }}
                >
                  {sectionName}
                </Typography>
              )}
            <Stack spacing={2}>
              {fields.map(([name, definition]) => {
                const confidence = document.confidence[name] ?? 0;
                const lowConfidence =
                  confidence > 0 && confidence < 80;
                const showConfidence = confidence > 0;

                return (
                  <Box key={name}>
                    {definition.type !== "checkbox" && (
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ mb: 0.75 }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {definition.label}
                        </Typography>
                        {showConfidence && (
                          <Chip
                            size="small"
                            icon={
                              lowConfidence ? (
                                <WarningAmberOutlinedIcon />
                              ) : (
                                <CheckCircleOutlineIcon />
                              )
                            }
                            label={`${confidence}%`}
                            color={lowConfidence ? "warning" : "success"}
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    )}
                    <Controller
                      name={name}
                      control={control}
                      rules={{
                        required: definition.required
                          ? `${definition.label} is required`
                          : false
                      }}
                      render={({ field, fieldState }) => {
                        if (definition.type === "checkbox") {
                          return (
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={isCheckedValue(field.value ?? "")}
                                  onChange={(event) =>
                                    field.onChange(
                                      event.target.checked ? "Yes" : ""
                                    )
                                  }
                                />
                              }
                              label={
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                >
                                  <Typography variant="body2">
                                    {definition.label}
                                  </Typography>
                                  {showConfidence && (
                                    <Chip
                                      size="small"
                                      label={`${confidence}%`}
                                      color={
                                        lowConfidence ? "warning" : "success"
                                      }
                                      variant="outlined"
                                    />
                                  )}
                                </Stack>
                              }
                            />
                          );
                        }

                        if (definition.type === "select") {
                          return (
                            <FormControl
                              fullWidth
                              error={Boolean(fieldState.error)}
                            >
                              <InputLabel>{definition.label}</InputLabel>
                              <Select
                                {...field}
                                label={definition.label}
                                sx={
                                  lowConfidence
                                    ? {
                                        bgcolor: "rgba(237, 108, 2, 0.06)"
                                      }
                                    : undefined
                                }
                              >
                                <MenuItem value="">
                                  <em>Not specified</em>
                                </MenuItem>
                                {definition.options?.map((option) => (
                                  <MenuItem key={option} value={option}>
                                    {option}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          );
                        }

                        return (
                          <TextField
                            {...field}
                            fullWidth
                            type={
                              definition.type === "textarea"
                                ? "text"
                                : definition.type
                            }
                            multiline={definition.type === "textarea"}
                            minRows={
                              definition.type === "textarea" ? 3 : undefined
                            }
                            error={Boolean(fieldState.error)}
                            helperText={fieldState.error?.message}
                            slotProps={
                              definition.type === "date"
                                ? { inputLabel: { shrink: true } }
                                : undefined
                            }
                            sx={
                              lowConfidence
                                ? {
                                    "& .MuiOutlinedInput-root": {
                                      bgcolor: "rgba(237, 108, 2, 0.06)"
                                    }
                                  }
                                : undefined
                            }
                          />
                        );
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Box>
        ))}
        {saved && (
          <Alert severity="success">Reviewed claim data has been saved.</Alert>
        )}
      </Stack>

      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper"
        }}
      >
        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          startIcon={<SaveOutlinedIcon />}
          disabled={saving}
        >
          {saving ? "Saving" : "Save reviewed data"}
        </Button>
      </Box>
    </Box>
  );
};
