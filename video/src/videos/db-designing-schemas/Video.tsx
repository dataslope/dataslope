import React from "react";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";

/** Placeholder for Database Design Unit 8: the series intro alone. */
export const DbDesigningSchemas: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <SeriesIntro course="Database Design with PostgreSQL" unit="Unit 8" title="Designing a schema" />
  </EditorialPage>
);
