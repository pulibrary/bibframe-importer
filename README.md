# Bibframe Importer
Alma Cloud App for importing Bibframe records from Marva to Alma.  (Currently in beta, being tested internally at Princeton University Library.)  Designed to be used as part of the following workflow:

1. Create/edit a record in the [Bibframe Marva Quartz Editor](https://bibframe.org/marva/)
1. Copy the Marva ID (the final part of the URL starting with a lowercase 'e', e.g. e123456).
1. In Alma, open the Bibframe Importer Cloud App
1. Paste the Marva ID into the "Marva ID" field, and click the "Load from Marva" button.  This will load the entire record (work and instance) into the text area.
1. Click the "Save to Alma" button.  This will save both the work and instance records to Alma, and display the MMS ID for each.

