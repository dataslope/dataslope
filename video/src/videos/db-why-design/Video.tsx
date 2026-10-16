import React from "react";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";

/** Placeholder for Database Design Unit 1: the series intro alone. */
export const DbWhyDesign: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <SeriesIntro course="Database Design with PostgreSQL" unit="Unit 1" title="What design is for" />
  </EditorialPage>
);
