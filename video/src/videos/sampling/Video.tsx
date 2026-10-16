import React from "react";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";

/** Placeholder for Statistics Unit 5, merged: the series intro alone. */
export const Sampling: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <SeriesIntro course="Statistics for Data Science with Python" unit="Unit 5" title="Sampling" />
  </EditorialPage>
);
