import React from "react";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";

/** Placeholder for Database Design Unit 7: the series intro alone. */
export const DbNormalization: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <SeriesIntro course="Database Design with PostgreSQL" unit="Unit 7" title="Normalization" />
  </EditorialPage>
);
