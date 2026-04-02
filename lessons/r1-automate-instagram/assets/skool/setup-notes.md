# R1 | Automate Instagram for 365 days

Course URL:
https://www.skool.com/robonuggets/classroom/c46a6d79?md=3cd4eceabff840c1948e250538d99cec

Video:
https://www.youtube.com/watch?v=e1rqBdo8oyU

Summary:
This tutorial shows how to create an AI agent that can run an Instagram account for 365 days or longer.

Original lesson notes:

- Register for Make.com if you want to inspect the original hosted workflow:
  https://www.make.com/en/register?pc=robonuggets
- The downloadable asset for the lesson is a Make blueprint:
  `assets/original/Automate Instagram.json`

Prompt from the lesson:

> Give me a table with 365 quotes from Naval Ravikant.
>
> With the following columns:
> Index - starting from 1
> Title - short title
> Quote - the actual quote, which should be less than 280 characters
> Instagram caption - short Instagram caption related to the quote, with 1 emoji and 2 hashtags

Blueprint summary:

1. Increment a scenario counter.
2. Read the matching row from Google Sheets.
3. Create a Dropbox share link for `/Navalism/{{counter}}.png`.
4. Publish the image and caption to Instagram.

Local rebuild note:

- Social publishing in this repo is now standardized on Blotato rather than direct Instagram APIs or browser posting.
- The lesson's final Make module is treated as the source behavior, but execution is routed through Blotato account lookup, media hosting, and post creation.
