import { CertificatePage } from "../../render/element-renderer";
import { sampleVariableBindings } from "../../variables";
import { useDesigner } from "../state/document-store";
import { CanvasElement } from "./canvas-element";
import styles from "./canvas-stage.module.scss";

export function CanvasStage() {
  const { state, dispatch } = useDesigner();
  const { document: doc, zoom, selectedId, editingTextId } = state;
  const bindings = sampleVariableBindings();

  return (
    <div className={styles.viewport}>
      <div
        className={styles.scaler}
        style={{
          width: doc.page.width * zoom,
          height: doc.page.height * zoom,
        }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            width: doc.page.width,
            height: doc.page.height,
          }}
          onPointerDown={() => {
            dispatch({ type: "SELECT", id: null });
            dispatch({ type: "STOP_EDIT_TEXT" });
          }}
        >
          <CertificatePage
            document={{ ...doc, elements: [] }}
            bindings={bindings}
            showGrid={doc.grid.snap}
            certificateNumberValue={bindings.certificate_id}
          >
            {doc.elements.map((element) => (
              <CanvasElement
                key={element.id}
                element={element}
                selected={selectedId === element.id}
                editing={editingTextId === element.id}
                bindings={bindings}
                snap={doc.grid.snap}
                gridSize={doc.grid.size}
                zoom={zoom}
                onSelect={() => dispatch({ type: "SELECT", id: element.id })}
                onChange={(patch, live) =>
                  dispatch({
                    type: live ? "UPDATE_ELEMENT_LIVE" : "UPDATE_ELEMENT",
                    id: element.id,
                    patch,
                  })
                }
                onBeginGesture={() => dispatch({ type: "BEGIN_GESTURE" })}
                onStartEdit={() =>
                  dispatch({ type: "START_EDIT_TEXT", id: element.id })
                }
                onStopEdit={() => dispatch({ type: "STOP_EDIT_TEXT" })}
              />
            ))}
          </CertificatePage>
        </div>
      </div>
    </div>
  );
}
