import React, { createContext, useState } from 'react';

export const MissionContext = createContext();

export function MissionProvider({ children }) {
    // These states will now survive even if you navigate to other pages
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [detections, setDetections] = useState([]);
    const [imageMeta, setImageMeta] = useState({ width: 1, height: 1 });
    const [selectedHazard, setSelectedHazard] = useState(null);
    const [boatCoordinates, setBoatCoordinates] = useState([18.9220, 72.8347]);

    return (
        <MissionContext.Provider value={{
            selectedFile, setSelectedFile,
            previewUrl, setPreviewUrl,
            detections, setDetections,
            imageMeta, setImageMeta,
            selectedHazard, setSelectedHazard,
            boatCoordinates, setBoatCoordinates
        }}>
            {children}
        </MissionContext.Provider>
    );
}