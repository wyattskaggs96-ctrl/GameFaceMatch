import { Alert, Button, Card, ScreenHeader, SelectField, TextField } from "@/components/design-system";
import {
  type AttributeConfirmationState,
  type AttributeValidationResult,
  attributeLabels,
  validateAttributeConfirmation
} from "@/lib/profile/attribute-confirmation";

export function AttributeConfirmation({
  value,
  onChange,
  onConfirm
}: {
  value: AttributeConfirmationState;
  onChange: (value: AttributeConfirmationState) => void;
  onConfirm: () => void;
}) {
  const validation = validateAttributeConfirmation(value);

  function update<Key extends keyof AttributeConfirmationState>(key: Key, nextValue: AttributeConfirmationState[Key]) {
    onChange({
      ...value,
      [key]: nextValue
    });
  }

  return (
    <section className="screen-stack" aria-labelledby="attribute-title">
      <ScreenHeader eyebrow="Attribute confirmation" title="Confirm standardized profile attributes" id="attribute-title">
        <p>
          These are user-provided profile attributes for future matching. They are not College Football 27 menu choices and are not inferred from your images.
        </p>
      </ScreenHeader>
      <Alert title="User-confirmed only" tone="info">
        GameFace Match does not infer sensitive traits, identify people, estimate age, or judge attractiveness. Leave optional marks blank if they are not
        useful for your build.
      </Alert>
      <Card className="form-card">
        <div className="form-grid">
          <SelectField
            label={attributeLabels.hairColorFamily}
            value={value.hairColorFamily}
            onChange={(event) => update("hairColorFamily", event.currentTarget.value)}
            note={fieldNote("hairColorFamily", validation)}
          >
            <option value="unspecified">Choose a general family</option>
            <option value="black">Black</option>
            <option value="brown">Brown</option>
            <option value="blonde">Blonde</option>
            <option value="red">Red</option>
            <option value="gray">Gray or white</option>
            <option value="bald">Bald or shaved</option>
            <option value="covered">Covered or not visible</option>
            <option value="other">Other user-described color</option>
          </SelectField>
          <SelectField
            label={attributeLabels.hairTextureFamily}
            value={value.hairTextureFamily}
            onChange={(event) => update("hairTextureFamily", event.currentTarget.value)}
            note={fieldNote("hairTextureFamily", validation)}
          >
            <option value="unspecified">Choose a general family</option>
            <option value="straight">Straight</option>
            <option value="wavy">Wavy</option>
            <option value="curly">Curly</option>
            <option value="coily">Coily</option>
            <option value="bald">Bald or shaved</option>
            <option value="covered">Covered or not visible</option>
            <option value="other">Other user-described texture</option>
          </SelectField>
          <SelectField
            label={attributeLabels.hairstyleFamily}
            value={value.hairstyleFamily}
            onChange={(event) => update("hairstyleFamily", event.currentTarget.value)}
            note={fieldNote("hairstyleFamily", validation)}
          >
            <option value="unspecified">Choose a general family</option>
            <option value="short">Short</option>
            <option value="medium">Medium length</option>
            <option value="long">Long</option>
            <option value="buzzed">Buzzed or close cut</option>
            <option value="braids">Braids</option>
            <option value="locs">Locs</option>
            <option value="tiedBack">Tied back</option>
            <option value="bald">Bald or shaved</option>
            <option value="covered">Covered or not visible</option>
            <option value="other">Other user-described style</option>
          </SelectField>
          <SelectField
            label={attributeLabels.facialHairPresence}
            value={value.facialHairPresence}
            onChange={(event) => update("facialHairPresence", event.currentTarget.value as AttributeConfirmationState["facialHairPresence"])}
            note={fieldNote("facialHairPresence", validation)}
          >
            <option value="unspecified">Choose one</option>
            <option value="none">No facial hair</option>
            <option value="yes">Facial hair present</option>
          </SelectField>
          <SelectField
            label={attributeLabels.facialHairStyleFamily}
            value={value.facialHairStyleFamily}
            onChange={(event) => update("facialHairStyleFamily", event.currentTarget.value)}
            note={fieldNote("facialHairStyleFamily", validation)}
            disabled={value.facialHairPresence !== "yes"}
          >
            <option value="unspecified">Choose if facial hair is present</option>
            <option value="stubble">Stubble</option>
            <option value="mustache">Mustache</option>
            <option value="goatee">Goatee</option>
            <option value="beard">Beard</option>
            <option value="fullBeard">Full beard</option>
            <option value="other">Other user-described style</option>
          </SelectField>
          <SelectField
            label={attributeLabels.facialHairColorFamily}
            value={value.facialHairColorFamily}
            onChange={(event) => update("facialHairColorFamily", event.currentTarget.value)}
            note={fieldNote("facialHairColorFamily", validation)}
            disabled={value.facialHairPresence !== "yes"}
          >
            <option value="unspecified">Choose if facial hair is present</option>
            <option value="black">Black</option>
            <option value="brown">Brown</option>
            <option value="blonde">Blonde</option>
            <option value="red">Red</option>
            <option value="gray">Gray or white</option>
            <option value="mixed">Mixed</option>
            <option value="other">Other user-described color</option>
          </SelectField>
          <SelectField
            label={attributeLabels.eyebrowThickness}
            value={value.eyebrowThickness}
            onChange={(event) => update("eyebrowThickness", event.currentTarget.value)}
            note={fieldNote("eyebrowThickness", validation)}
          >
            <option value="unspecified">Choose a general family</option>
            <option value="thin">Thin</option>
            <option value="medium">Medium</option>
            <option value="thick">Thick</option>
            <option value="covered">Covered or not visible</option>
          </SelectField>
          <TextField
            label={attributeLabels.visibleMarks}
            type="text"
            value={value.visibleMarks}
            onChange={(event) => update("visibleMarks", event.currentTarget.value)}
            placeholder="Optional user-entered note"
            note="Optional. Do not enter medical or identity information."
          />
          <TextField
            label={attributeLabels.desiredInGameHeight}
            type="number"
            min={48}
            max={96}
            value={value.desiredInGameHeight}
            onChange={(event) => update("desiredInGameHeight", event.currentTarget.value)}
            placeholder="Example: 72"
            note={fieldNote("desiredInGameHeight", validation) ?? "Use inches for the standardized profile."}
          />
          <TextField
            label={attributeLabels.desiredInGameWeight}
            type="number"
            min={80}
            max={450}
            value={value.desiredInGameWeight}
            onChange={(event) => update("desiredInGameWeight", event.currentTarget.value)}
            placeholder="Example: 205"
            note={fieldNote("desiredInGameWeight", validation) ?? "Use pounds for the standardized profile."}
          />
          <SelectField
            label={attributeLabels.preferredBodyType}
            value={value.preferredBodyType}
            onChange={(event) => update("preferredBodyType", event.currentTarget.value)}
            note={fieldNote("preferredBodyType", validation)}
          >
            <option value="unspecified">Choose a general body preference</option>
            <option value="lean">Lean</option>
            <option value="balanced">Balanced</option>
            <option value="muscular">Muscular</option>
            <option value="heavy">Heavy</option>
            <option value="other">Other user-described build</option>
          </SelectField>
          <SelectField
            label={attributeLabels.resemblancePhysiquePreference}
            value={value.resemblancePhysiquePreference}
            onChange={(event) =>
              update("resemblancePhysiquePreference", event.currentTarget.value as AttributeConfirmationState["resemblancePhysiquePreference"])
            }
            note={fieldNote("resemblancePhysiquePreference", validation)}
          >
            <option value="unspecified">Choose a priority</option>
            <option value="facialResemblance">Prioritize facial resemblance</option>
            <option value="balanced">Balance face and athlete build</option>
            <option value="athletePhysique">Prioritize desired athlete physique</option>
          </SelectField>
        </div>
      </Card>
      {!validation.isValid ? (
        <Alert title="Required profile details missing" tone="warning" role="alert">
          Complete the required standardized fields before creating the local profile foundation.
        </Alert>
      ) : (
        <Alert title="Profile inputs ready" tone="success">
          These inputs can create a local derived profile without storing raw images in browser storage.
        </Alert>
      )}
      <Button onClick={onConfirm} disabled={!validation.isValid}>
        Create profile review
      </Button>
    </section>
  );
}

function fieldNote(key: keyof AttributeConfirmationState, validation: AttributeValidationResult) {
  return validation.errors[key];
}
