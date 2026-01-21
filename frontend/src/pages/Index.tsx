/**
 * File: Index.tsx
 * Author: Hiba Noor
 *
 * Purpose:
 *   Landing page for the blank app template.
 *   Displays a welcome message and encourages users to start building their project.
 */

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      {/* Centered Welcome Content */}
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">
          Welcome to Your Blank App
        </h1>
        <p className="text-xl text-muted-foreground">
          Start building your amazing project here!
        </p>
      </div>
    </div>
  );
};

export default Index;
