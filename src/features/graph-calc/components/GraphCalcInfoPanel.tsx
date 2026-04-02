import { memo } from 'react';

interface HoverInfo {
  x: number;
  y: number;
  fnId: string;
  pixelX: number;
  pixelY: number;
}

interface TangentInfo {
  fnId: string;
  x: number;
  y: number;
  slope: number;
}

interface AreaInfo {
  fnId: string;
  xStart: number;
  xEnd: number;
  area: number;
}

interface Props {
  hoverInfo: HoverInfo | null;
  tangentInfo: TangentInfo | null;
  areaInfo: AreaInfo | null;
}

export const GraphCalcInfoPanel = memo(function GraphCalcInfoPanel({
  hoverInfo,
  tangentInfo,
  areaInfo,
}: Props) {
  return (
    <>
      {/* Hover tooltip */}
      {hoverInfo && (
        <div
          className="graph-calc-info-tooltip"
          style={{
            left: hoverInfo.pixelX + 15,
            top: hoverInfo.pixelY - 30,
          }}
        >
          <span className="graph-calc-info-coord">
            ({hoverInfo.x.toFixed(4)}, {hoverInfo.y.toFixed(4)})
          </span>
        </div>
      )}

      {/* Tangent info panel */}
      {tangentInfo && (
        <div className="graph-calc-tangent-info">
          <strong>Tangent at ({tangentInfo.x.toFixed(3)}, {tangentInfo.y.toFixed(3)})</strong>
          <span>Slope: {tangentInfo.slope.toFixed(4)}</span>
          <span>y = {tangentInfo.slope.toFixed(3)}(x - {tangentInfo.x.toFixed(3)}) + {tangentInfo.y.toFixed(3)}</span>
        </div>
      )}

      {/* Area info panel */}
      {areaInfo && (
        <div className="graph-calc-area-info">
          <strong>Definite Integral</strong>
          <span>
            from x = {areaInfo.xStart.toFixed(3)} to x = {areaInfo.xEnd.toFixed(3)}
          </span>
          <span>Area = {areaInfo.area.toFixed(6)}</span>
        </div>
      )}
    </>
  );
});
